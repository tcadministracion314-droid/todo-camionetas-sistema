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

export async function buscarVentasParaDevolucion(texto) {
  const snap = await getDocs(collection(db, COLECCION));
  const activas = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((v) => !v.estado || v.estado === "activa");

  const t = texto.trim().toLowerCase();
  const filtradas = t
    ? activas.filter(
        (v) =>
          v.productoNombre?.toLowerCase().includes(t) ||
          v.marcaRepuesto?.toLowerCase().includes(t)
      )
    : activas;

  return filtradas
    .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
    .slice(0, 20);
}

export async function registrarVenta({
  producto,
  proveedorNombre,
  cantidad,
  precioUnitario,
  descuentoTipo,
  descuentoValor,
  metodoPago,
  vendedor,
}) {
  const cantidadNum = Number(cantidad);
  const precioNum = Number(precioUnitario);
  const subtotal = precioNum * cantidadNum;
  const descuentoMonto =
    descuentoTipo === "porcentaje"
      ? Math.round((subtotal * (Number(descuentoValor) || 0)) / 100)
      : Number(descuentoValor) || 0;
  const total = Math.max(0, subtotal - descuentoMonto);

  const productoRef = doc(db, "productos", producto.id);
  const ventaRef = doc(collection(db, COLECCION));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(productoRef);
    if (!snap.exists()) throw new Error("El producto ya no existe en Inventario.");

    const datos = snap.data();
    const proveedores = datos.proveedores || [];
    const idx = proveedores.findIndex((p) => p.nombre === proveedorNombre);
    if (idx === -1) {
      throw new Error("Ese proveedor ya no está disponible para este producto.");
    }

    const stockActual = proveedores[idx].stock || 0;
    if (stockActual < cantidadNum) {
      throw new Error(
        `No hay stock suficiente en ${proveedorNombre} (quedan ${stockActual}).`
      );
    }

    const nuevosProveedores = proveedores.map((p, i) =>
      i === idx ? { ...p, stock: stockActual - cantidadNum } : p
    );
    tx.update(productoRef, { proveedores: nuevosProveedores, updatedAt: serverTimestamp() });

    tx.set(ventaRef, {
      vendedorId: vendedor.uid,
      vendedorEmail: vendedor.email,
      productoId: producto.id,
      productoNombre: producto.nombre,
      marcaRepuesto: producto.marcaRepuesto,
      proveedorNombre,
      cantidad: cantidadNum,
      precioUnitario: precioNum,
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
