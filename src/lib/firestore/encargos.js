import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "encargos";

export function subscribeEncargos(callback) {
  const q = query(collection(db, COLECCION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function crearEncargo(datos) {
  return addDoc(collection(db, COLECCION), {
    ...datos,
    estado: "pendiente",
    fechaEstimadaLlegada: datos.fechaEstimadaLlegada
      ? Timestamp.fromDate(new Date(datos.fechaEstimadaLlegada))
      : null,
    createdAt: serverTimestamp(),
  });
}
