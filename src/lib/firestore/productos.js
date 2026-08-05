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

function limpiarProveedores(proveedores) {
  return (proveedores || [])
    .map((p) => ({
      nombre: p.nombre.trim(),
      codigo: p.codigo?.trim() || null,
      costo: p.costo !== "" && p.costo !== undefined ? Number(p.costo) : null,
      venta: p.venta !== "" && p.venta !== undefined ? Number(p.venta) : null,
      stock: p.stock !== "" && p.stock !== undefined ? Number(p.stock) : null,
      fecha: p.fecha
        ? Timestamp.fromDate(new Date(p.fecha))
        : null,
    }))
    .filter((p) => p.nombre);
}

function limpiarDatosProducto(datos) {
  const proveedores = limpiarProveedores(datos.proveedores);
  if (proveedores.length === 0) {
    throw new Error("Debes ingresar al menos un proveedor.");
  }

  const tieneStock = proveedores.some((p) => p.stock !== null && p.stock > 0);
  const tipoInventario =
    datos.tipoInventario === "proyectado" && tieneStock
      ? "en_bodega"
      : datos.tipoInventario;

  return {
    nombre: datos.nombre.trim(),
    marcaRepuesto: datos.marcaRepuesto.trim(),
    marcaVehiculo: datos.marcaVehiculo?.trim() || null,
    categoria: datos.categoria,
    subcategoria: datos.categoria === "accesorio" ? datos.subcategoria : null,
    tipoRepuesto: datos.categoria === "repuesto" ? datos.tipoRepuesto?.trim() || null : null,
    modelo: datos.modelo.trim(),
    anioDesde: datos.anioDesde ? Number(datos.anioDesde) : null,
    anioHasta: datos.anioHasta ? Number(datos.anioHasta) : null,
    glosaTecnica: datos.glosaTecnica?.trim() || null,
    fotoUrl: datos.fotoUrl || null,
    tipoInventario,
    proveedores,
    codigoOriginal: datos.codigoOriginal?.trim() || null,
  };
}

export async function crearProducto(datos) {
  const limpio = limpiarDatosProducto(datos);

  await Promise.all([
    crearValorCatalogoSiNoExiste("marcasRepuesto", limpio.marcaRepuesto),
    limpio.marcaVehiculo
      ? crearValorCatalogoSiNoExiste("marcasVehiculo", limpio.marcaVehiculo)
      : Promise.resolve(),
    limpio.tipoRepuesto
      ? crearValorCatalogoSiNoExiste("tiposRepuesto", limpio.tipoRepuesto)
      : Promise.resolve(),
    ...limpio.proveedores.map((p) =>
      crearValorCatalogoSiNoExiste("proveedores", p.nombre)
    ),
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
    crearValorCatalogoSiNoExiste("marcasRepuesto", limpio.marcaRepuesto),
    limpio.marcaVehiculo
      ? crearValorCatalogoSiNoExiste("marcasVehiculo", limpio.marcaVehiculo)
      : Promise.resolve(),
    limpio.tipoRepuesto
      ? crearValorCatalogoSiNoExiste("tiposRepuesto", limpio.tipoRepuesto)
      : Promise.resolve(),
    ...limpio.proveedores.map((p) =>
      crearValorCatalogoSiNoExiste("proveedores", p.nombre)
    ),
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
