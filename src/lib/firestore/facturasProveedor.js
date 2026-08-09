import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "facturasProveedor";

export function subscribeFacturasProveedor(callback) {
  const q = query(collection(db, COLECCION), orderBy("fecha", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function crearFacturaProveedor({
  fecha,
  fechaPago,
  proveedor,
  numeroFactura,
  valor,
}) {
  return addDoc(collection(db, COLECCION), {
    fecha: Timestamp.fromDate(new Date(fecha)),
    fechaPago: fechaPago ? Timestamp.fromDate(new Date(fechaPago)) : null,
    proveedor: proveedor.trim(),
    numeroFactura: numeroFactura?.trim() || null,
    valor: Number(valor),
    createdAt: serverTimestamp(),
  });
}
