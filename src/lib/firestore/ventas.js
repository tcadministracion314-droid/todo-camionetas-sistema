import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  runTransaction,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "ventas";

export function subscribeVentasVendedor(vendedorId, callback) {
  const q = query(collection(db, COLECCION), where("vendedorId", "==", vendedorId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeTodasVentas(callback) {
  return onSnapshot(collection(db, COLECCION), (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function buscarVentasParaDevolucion(texto) {
  const snap = await getDocs(collection(db, COLECCION));
  const ventas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const t = texto.trim().toLowerCase();

  const resultados = [];
  ventas.forEach((venta) => {
    (venta.items || []).forEach((item, itemIndex) => {
      if (item.estado !== "activo") return;
      const coincide =
        !t ||
        item.productoNombre?.toLowerCase().includes(t) ||
        item.marcaRepuesto?.toLowerCase().includes(t);
      if (coincide) resultados.push({ venta, itemIndex, item });
    });
  });

  return resultados
    .sort((a, b) => (b.venta.fecha?.toMillis?.() ?? 0) - (a.venta.fecha?.toMillis?.() ?? 0))
    .slice(0, 20);
}

export async function registrarVenta({
  items,
  descuentoTipo,
  descuentoValor,
  metodoPago,
  vendedor,
}) {
  const itemsCalculados = items.map((it) => {
    const cantidadNum = Number(it.cantidad);
    const precioNum = Number(it.precioUnitario);
    return {
      productoId: it.producto.id,
      productoNombre: it.producto.nombre,
      marcaRepuesto: it.producto.marcaRepuesto,
      proveedorNombre: it.proveedorNombre,
      cantidad: cantidadNum,
      precioUnitario: precioNum,
      subtotal: cantidadNum * precioNum,
      estado: "activo",
    };
  });

  const subtotal = itemsCalculados.reduce((acc, it) => acc + it.subtotal, 0);
  const descuentoMonto =
    descuentoTipo === "porcentaje"
      ? Math.round((subtotal * (Number(descuentoValor) || 0)) / 100)
      : Number(descuentoValor) || 0;
  const total = Math.max(0, subtotal - descuentoMonto);

  const ventaRef = doc(collection(db, COLECCION));
  const productoIds = [...new Set(items.map((it) => it.producto.id))];
  const refsPorId = new Map(productoIds.map((id) => [id, doc(db, "productos", id)]));

  await runTransaction(db, async (tx) => {
    const snapsPorId = new Map();
    for (const id of productoIds) {
      snapsPorId.set(id, await tx.get(refsPorId.get(id)));
    }

    const proveedoresPorId = new Map();
    productoIds.forEach((id) => {
      const snap = snapsPorId.get(id);
      if (!snap.exists()) {
        throw new Error("Uno de los productos de la venta ya no existe en Inventario.");
      }
      proveedoresPorId.set(id, [...(snap.data().proveedores || [])]);
    });

    items.forEach((it) => {
      const proveedores = proveedoresPorId.get(it.producto.id);
      const idx = proveedores.findIndex((p) => p.nombre === it.proveedorNombre);
      if (idx === -1) {
        throw new Error(`Ese proveedor ya no está disponible para "${it.producto.nombre}".`);
      }
      const cantidadNum = Number(it.cantidad);
      const stockActual = proveedores[idx].stock || 0;
      if (stockActual < cantidadNum) {
        throw new Error(
          `No hay stock suficiente de "${it.producto.nombre}" en ${it.proveedorNombre} (quedan ${stockActual}).`
        );
      }
      proveedores[idx] = { ...proveedores[idx], stock: stockActual - cantidadNum };
    });

    productoIds.forEach((id) => {
      tx.update(refsPorId.get(id), {
        proveedores: proveedoresPorId.get(id),
        updatedAt: serverTimestamp(),
      });
    });

    tx.set(ventaRef, {
      vendedorId: vendedor.uid,
      vendedorEmail: vendedor.email,
      items: itemsCalculados,
      subtotal,
      descuentoTipo,
      descuentoValor: Number(descuentoValor) || 0,
      descuentoMonto,
      total,
      metodoPago,
      tipo: "normal",
      fecha: serverTimestamp(),
    });
  });
}

export async function actualizarMetodoPagoVenta(id, metodoPago) {
  await updateDoc(doc(db, COLECCION, id), { metodoPago });
}
