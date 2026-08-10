import {
  collection,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "facturasProveedor";

export function subscribeFacturasProveedor(callback) {
  const q = query(collection(db, COLECCION), orderBy("fecha", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function marcarFacturaPagada(id) {
  await updateDoc(doc(db, COLECCION, id), { fechaPago: serverTimestamp() });
}
