import {
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { crearProducto } from "./productos";

const COLECCION = "compras";

export function subscribeCompras(callback) {
  const q = query(collection(db, COLECCION), orderBy("fecha", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function registrarCompraProductoExistente({
  producto,
  proveedorNombre,
  cantidad,
  costoUnitario,
  comprador,
}) {
  const cantidadNum = Number(cantidad);
  const costoNum = Number(costoUnitario);
  const total = cantidadNum * costoNum;

  const productoRef = doc(db, "productos", producto.id);
  const compraRef = doc(collection(db, COLECCION));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(productoRef);
    if (!snap.exists()) throw new Error("El producto ya no existe en Inventario.");

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

    tx.set(compraRef, {
      productoId: producto.id,
      productoNombre: producto.nombre,
      marcaRepuesto: producto.marcaRepuesto,
      proveedorNombre,
      cantidad: cantidadNum,
      costoUnitario: costoNum,
      total,
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
}) {
  await addDoc(collection(db, COLECCION), {
    productoId,
    productoNombre,
    marcaRepuesto,
    proveedorNombre,
    cantidad,
    costoUnitario,
    total: cantidad * costoUnitario,
    compradorId: comprador.uid,
    compradorEmail: comprador.email,
    fecha: serverTimestamp(),
  });
}
