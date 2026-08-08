import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "encargos";

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
