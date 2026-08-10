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
import { crearValorCatalogoSiNoExiste } from "./catalogo";

const COLECCION = "gastos";

export function subscribeGastos(callback) {
  const q = query(collection(db, COLECCION), orderBy("fecha", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function crearGasto({ fecha, categoria, descripcion, valor, registradoPor }) {
  const categoriaLimpia = categoria.trim();
  await crearValorCatalogoSiNoExiste("categoriasGasto", categoriaLimpia);

  return addDoc(collection(db, COLECCION), {
    fecha: Timestamp.fromDate(new Date(fecha)),
    categoria: categoriaLimpia,
    descripcion: descripcion?.trim() || null,
    valor: Number(valor),
    registradoPorId: registradoPor.uid,
    registradoPorEmail: registradoPor.email,
    createdAt: serverTimestamp(),
  });
}
