import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "cotizaciones";

export function subscribeCotizaciones(callback) {
  const q = query(collection(db, COLECCION), orderBy("fecha", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function crearCotizacion(datos) {
  return addDoc(collection(db, COLECCION), {
    ...datos,
    fecha: serverTimestamp(),
  });
}
