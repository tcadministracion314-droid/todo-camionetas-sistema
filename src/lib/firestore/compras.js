import {
  collection,
  doc,
  addDoc,
  query,
  where,
  limit,
  getDocs,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { crearProducto } from "./productos";

const COLECCION = "compras";
const COLECCION_FACTURAS = "facturasProveedor";

export function subscribeCompras(callback) {
  const q = query(collection(db, COLECCION), orderBy("fecha", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

async function resolverFactura({ proveedorNombre, numeroFactura, fechaFactura }) {
  if (!numeroFactura) return { ref: null, esNueva: false };

  const q = query(
    collection(db, COLECCION_FACTURAS),
    where("proveedor", "==", proveedorNombre),
    where("numeroFactura", "==", numeroFactura),
    limit(1)
  );
  const existentes = await getDocs(q);
  if (!existentes.empty) {
    return { ref: existentes.docs[0].ref, esNueva: false };
  }
  return {
    ref: doc(collection(db, COLECCION_FACTURAS)),
    esNueva: true,
    fecha: fechaFactura ? Timestamp.fromDate(new Date(fechaFactura)) : Timestamp.now(),
  };
}

export async function registrarCompraProductoExistente({
  producto,
  proveedorNombre,
  cantidad,
  costoUnitario,
  comprador,
  numeroFactura,
  fechaFactura,
}) {
  const cantidadNum = Number(cantidad);
  const costoNum = Number(costoUnitario);
  const total = cantidadNum * costoNum;

  const productoRef = doc(db, "productos", producto.id);
  const compraRef = doc(collection(db, COLECCION));
  const factura = await resolverFactura({
    proveedorNombre,
    numeroFactura: numeroFactura?.trim(),
    fechaFactura,
  });

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(productoRef);
    if (!snap.exists()) throw new Error("El producto ya no existe en Inventario.");
    const facturaSnap = factura.ref && !factura.esNueva ? await tx.get(factura.ref) : null;

    const datos = snap.data();
    const proveedores = datos.proveedores || [];
    const idx = proveedores.findIndex((p) => p.nombre === proveedorNombre);

    let nuevosProveedores;
    if (idx === -1) {
      nuevosProveedores = [
        ...proveedores,
        {
          nombre: proveedorNombre,
          codigo: null,
          costo: costoNum,
          venta: null,
          stock: cantidadNum,
          fecha: serverTimestamp(),
        },
      ];
    } else {
      nuevosProveedores = proveedores.map((p, i) =>
        i === idx
          ? { ...p, stock: (p.stock || 0) + cantidadNum, costo: costoNum }
          : p
      );
    }

    const tipoInventario =
      datos.tipoInventario === "proyectado" ? "en_bodega" : datos.tipoInventario;

    tx.update(productoRef, {
      proveedores: nuevosProveedores,
      tipoInventario,
      updatedAt: serverTimestamp(),
    });

    if (factura.ref) {
      if (factura.esNueva) {
        tx.set(factura.ref, {
          fecha: factura.fecha,
          fechaPago: null,
          proveedor: proveedorNombre,
          numeroFactura: numeroFactura.trim(),
          valor: total,
          createdAt: serverTimestamp(),
        });
      } else {
        tx.update(factura.ref, { valor: (facturaSnap.data().valor || 0) + total });
      }
    }

    tx.set(compraRef, {
      productoId: producto.id,
      productoNombre: producto.nombre,
      marcaRepuesto: producto.marcaRepuesto,
      proveedorNombre,
      cantidad: cantidadNum,
      costoUnitario: costoNum,
      total,
      facturaId: factura.ref?.id || null,
      compradorId: comprador.uid,
      compradorEmail: comprador.email,
      fecha: serverTimestamp(),
    });
  });
}

export async function registrarCompraProductoNuevo({
  nombre,
  marcaRepuesto,
  marcaVehiculo,
  categoria,
  modelo,
  proveedorNombre,
  cantidad,
  costoUnitario,
  comprador,
  numeroFactura,
  fechaFactura,
}) {
  const cantidadNum = Number(cantidad);
  const costoNum = Number(costoUnitario);

  const productoRef = await crearProducto({
    nombre,
    marcaRepuesto,
    marcaVehiculo,
    categoria,
    modelo,
    tipoInventario: "en_bodega",
    proveedores: [
      {
        nombre: proveedorNombre,
        codigo: "",
        costo: costoNum,
        venta: "",
        stock: cantidadNum,
        fecha: new Date().toISOString().slice(0, 10),
      },
    ],
    codigoOriginal: "",
  });

  await registrarCompraDirecta({
    productoId: productoRef.id,
    productoNombre: nombre,
    marcaRepuesto,
    proveedorNombre,
    cantidad: cantidadNum,
    costoUnitario: costoNum,
    comprador,
    numeroFactura: numeroFactura?.trim(),
    fechaFactura,
  });

  return productoRef;
}

async function registrarCompraDirecta({
  productoId,
  productoNombre,
  marcaRepuesto,
  proveedorNombre,
  cantidad,
  costoUnitario,
  comprador,
  numeroFactura,
  fechaFactura,
}) {
  const total = cantidad * costoUnitario;
  const factura = await resolverFactura({ proveedorNombre, numeroFactura, fechaFactura });

  if (factura.ref) {
    await runTransaction(db, async (tx) => {
      const facturaSnap = !factura.esNueva ? await tx.get(factura.ref) : null;
      if (factura.esNueva) {
        tx.set(factura.ref, {
          fecha: factura.fecha,
          fechaPago: null,
          proveedor: proveedorNombre,
          numeroFactura,
          valor: total,
          createdAt: serverTimestamp(),
        });
      } else {
        tx.update(factura.ref, { valor: (facturaSnap.data().valor || 0) + total });
      }
    });
  }

  await addDoc(collection(db, COLECCION), {
    productoId,
    productoNombre,
    marcaRepuesto,
    proveedorNombre,
    cantidad,
    costoUnitario,
    total,
    facturaId: factura.ref?.id || null,
    compradorId: comprador.uid,
    compradorEmail: comprador.email,
    fecha: serverTimestamp(),
  });
}
