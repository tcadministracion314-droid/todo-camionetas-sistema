import {
  collection,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase";

export function subscribeCatalogo(coleccion, callback) {
  const q = query(collection(db, coleccion), orderBy("nombre"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });
}

export async function crearValorCatalogoSiNoExiste(coleccion, nombre) {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return;

  const q = query(
    collection(db, coleccion),
    where("nombre", "==", nombreLimpio),
    limit(1)
  );
  const existentes = await getDocs(q);
  if (!existentes.empty) return;

  await addDoc(collection(db, coleccion), { nombre: nombreLimpio });
}

export async function actualizarDiasCreditoProveedor(id, diasCredito) {
  await updateDoc(doc(db, "proveedores", id), {
    diasCredito: diasCredito === "" ? null : Number(diasCredito),
  });
}
