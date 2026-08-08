import {
  collection,
  doc,
  addDoc,
  updateDoc,
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

export async function marcarLlegado(id) {
  await updateDoc(doc(db, COLECCION, id), { estado: "llego" });
}

export async function marcarEntregado(id, { pagoSaldo, metodoPagoSaldo, precioTotal }) {
  const datos = { estado: "entregado" };
  if (pagoSaldo) {
    datos.montoAbonado = precioTotal;
    datos.estadoPago = "pagado";
    datos.metodoPagoSaldo = metodoPagoSaldo;
  }
  await updateDoc(doc(db, COLECCION, id), datos);
}
