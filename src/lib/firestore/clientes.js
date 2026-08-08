import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  limit,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "clientes";

export function subscribeClientes(callback) {
  const q = query(collection(db, COLECCION), orderBy("nombre"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function buscarOCrearCliente({ nombre, telefono, correo }) {
  const telefonoLimpio = telefono?.trim() || "";
  const nombreLimpio = nombre?.trim() || "";
  const correoLimpio = correo?.trim() || "";

  if (telefonoLimpio) {
    const q = query(
      collection(db, COLECCION),
      where("telefono", "==", telefonoLimpio),
      limit(1)
    );
    const existentes = await getDocs(q);
    if (!existentes.empty) {
      const encontrado = existentes.docs[0];
      await updateDoc(encontrado.ref, {
        nombre: nombreLimpio || encontrado.data().nombre,
        correo: correoLimpio || encontrado.data().correo || null,
      });
      return encontrado.id;
    }
  }

  const nuevo = await addDoc(collection(db, COLECCION), {
    nombre: nombreLimpio,
    telefono: telefonoLimpio || null,
    correo: correoLimpio || null,
    createdAt: serverTimestamp(),
  });
  return nuevo.id;
}
