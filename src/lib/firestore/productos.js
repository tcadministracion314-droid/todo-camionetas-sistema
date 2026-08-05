import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../firebase";
import { crearValorCatalogoSiNoExiste } from "./catalogo";

const COLECCION = "productos";

export function subscribeProductos(callback) {
  const q = query(collection(db, COLECCION), orderBy("nombre"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function subirFotoProducto(file) {
  const nombreArchivo = `productos/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, nombreArchivo);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function eliminarFotoProducto(fotoUrl) {
  if (!fotoUrl) return;
  try {
    const storageRef = ref(storage, fotoUrl);
    await deleteObject(storageRef);
  } catch {
    // La foto ya no existe o la URL no es de Storage; no es un error bloqueante.
  }
}

function limpiarDatosProducto(datos) {
  return {
    nombre: datos.nombre.trim(),
    marca: datos.marca.trim(),
    categoria: datos.categoria,
    subcategoria: datos.categoria === "accesorio" ? datos.subcategoria : null,
    tipoRepuesto: datos.categoria === "repuesto" ? datos.tipoRepuesto?.trim() || null : null,
    modelo: datos.modelo.trim(),
    anioDesde: datos.anioDesde ? Number(datos.anioDesde) : null,
    anioHasta: datos.anioHasta ? Number(datos.anioHasta) : null,
    stock: datos.stock !== "" ? Number(datos.stock) : null,
    precioCosto: datos.precioCosto !== "" ? Number(datos.precioCosto) : null,
    precioVenta: datos.precioVenta !== "" ? Number(datos.precioVenta) : null,
    fechaIngreso: datos.fechaIngreso
      ? Timestamp.fromDate(new Date(datos.fechaIngreso))
      : null,
    fotoUrl: datos.fotoUrl || null,
    tipoInventario: datos.tipoInventario,
    proveedor: datos.proveedor?.trim() || null,
  };
}

export async function crearProducto(datos) {
  const limpio = limpiarDatosProducto(datos);

  await Promise.all([
    crearValorCatalogoSiNoExiste("marcas", limpio.marca),
    limpio.tipoRepuesto
      ? crearValorCatalogoSiNoExiste("tiposRepuesto", limpio.tipoRepuesto)
      : Promise.resolve(),
  ]);

  return addDoc(collection(db, COLECCION), {
    ...limpio,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function actualizarProducto(id, datos) {
  const limpio = limpiarDatosProducto(datos);

  await Promise.all([
    crearValorCatalogoSiNoExiste("marcas", limpio.marca),
    limpio.tipoRepuesto
      ? crearValorCatalogoSiNoExiste("tiposRepuesto", limpio.tipoRepuesto)
      : Promise.resolve(),
  ]);

  return updateDoc(doc(db, COLECCION, id), {
    ...limpio,
    updatedAt: serverTimestamp(),
  });
}

export async function eliminarProducto(id, fotoUrl) {
  await deleteDoc(doc(db, COLECCION, id));
  if (fotoUrl) await eliminarFotoProducto(fotoUrl);
}
