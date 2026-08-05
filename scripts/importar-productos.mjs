import * as XLSX from "@e965/xlsx";
import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const PROVEEDOR_RELLENO = "Sin proveedor especificado";
const SECCION_ACCESORIOS = "accesorios y aditivos";

const carpeta = path.resolve("datos-privados");
const archivoExcel = fs.readdirSync(carpeta).find((f) => f.toLowerCase().endsWith(".xlsx"));
if (!archivoExcel) {
  console.error("No se encontró ningún archivo .xlsx en datos-privados/");
  process.exit(1);
}
const rutaExcel = path.join(carpeta, archivoExcel);
const rutaCredenciales = path.join(carpeta, "firebase-service-account.json");

function limpiarEspacios(texto) {
  return String(texto ?? "").replace(/\s+/g, " ").trim();
}

function expandirAnio(fragmento) {
  const n = Number(fragmento);
  if (Number.isNaN(n)) return null;
  if (fragmento.length >= 4) return n;
  return n >= 50 ? 1900 + n : 2000 + n;
}

function parsearRangoAnio(texto) {
  const limpio = limpiarEspacios(texto).toLowerCase();
  if (!limpio) return { desde: null, hasta: null };
  if (limpio === "todas" || limpio === "todos") return { desde: null, hasta: null };

  const partes = limpio.split("-");
  if (partes.length === 1) {
    const anio = expandirAnio(partes[0].trim());
    return { desde: anio, hasta: anio };
  }
  if (partes.length === 2) {
    const izq = partes[0].trim();
    const der = partes[1].trim();
    return {
      desde: izq ? expandirAnio(izq) : null,
      hasta: der ? expandirAnio(der) : null,
    };
  }
  return { desde: null, hasta: null };
}

function excelFechaADate(serial) {
  if (serial === null || serial === undefined || serial === "") return null;
  const n = Number(serial);
  if (Number.isNaN(n)) return null;
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

function numeroONull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// --- Leer y mapear celdas combinadas ---
const buffer = fs.readFileSync(rutaExcel);
const libro = XLSX.read(buffer, { type: "buffer" });
const hoja = libro.Sheets[libro.SheetNames[0]];
const rango = XLSX.utils.decode_range(hoja["!ref"]);

const origenPorCelda = new Map();
for (const m of hoja["!merges"] || []) {
  const origen = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
  for (let r = m.s.r; r <= m.e.r; r++) {
    for (let c = m.s.c; c <= m.e.c; c++) {
      origenPorCelda.set(XLSX.utils.encode_cell({ r, c }), origen);
    }
  }
}
function valorCelda(r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const addrOrigen = origenPorCelda.get(addr) || addr;
  const celda = hoja[addrOrigen];
  return celda ? celda.v : null;
}
function filaCompleta(r) {
  const vals = [];
  for (let c = rango.s.c; c <= rango.e.c; c++) vals.push(valorCelda(r, c));
  return vals;
}
function noNulos(vals) {
  return vals.filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;
}

// --- Recorrer filas, detectar secciones, y armar filas de datos ---
const filasProcesadas = [];
let seccionActual = null;
let filasSinArticulo = 0;

for (let r = rango.s.r; r <= rango.e.r; r++) {
  const vals = filaCompleta(r);
  const nn = noNulos(vals);
  const primero = vals[0] ? String(vals[0]).trim() : "";

  if (nn === 0) continue;
  if (nn === 1 && primero) {
    seccionActual = limpiarEspacios(primero);
    continue;
  }
  if (primero === "Artículo") continue;

  const [articulo, , , , marca, , , , modelo, , , anio, importador, codigoImportador] = vals;
  const costo = vals[16];
  const venta = vals[17];
  const stock = vals[18];
  const fecha = vals[19];
  const codigoOriginal = vals[20];

  if (!articulo || !limpiarEspacios(articulo)) {
    filasSinArticulo++;
    continue;
  }

  filasProcesadas.push({
    seccion: seccionActual,
    articulo: limpiarEspacios(articulo),
    marca: limpiarEspacios(marca),
    modelo: limpiarEspacios(modelo),
    anioTexto: limpiarEspacios(anio),
    importador: limpiarEspacios(importador),
    codigoImportador: limpiarEspacios(codigoImportador),
    costo: numeroONull(costo),
    venta: numeroONull(venta),
    stock: numeroONull(stock),
    fecha: excelFechaADate(fecha),
    codigoOriginal: limpiarEspacios(codigoOriginal),
  });
}

// --- Agrupar filas en productos ---
const productosPorClave = new Map();

for (const fila of filasProcesadas) {
  const clave = [fila.articulo, fila.marca, fila.modelo, fila.anioTexto]
    .map((v) => v.toLowerCase())
    .join("|");

  if (!productosPorClave.has(clave)) {
    const esAccesorio = fila.seccion
      ?.toLowerCase()
      .replace(/[.\s]+$/, "")
      .startsWith(SECCION_ACCESORIOS);
    const { desde, hasta } = parsearRangoAnio(fila.anioTexto);

    productosPorClave.set(clave, {
      nombre: fila.articulo,
      marcaRepuesto: fila.marca || "Sin marca",
      marcaVehiculo: null,
      categoria: esAccesorio ? "accesorio" : "repuesto",
      subcategoria: null,
      tipoRepuesto: esAccesorio ? null : fila.seccion,
      modelo: fila.modelo || null,
      anioDesde: desde,
      anioHasta: hasta,
      glosaTecnica: null,
      codigoOriginal: fila.codigoOriginal || null,
      fotoUrl: null,
      tipoInventario: "en_bodega",
      proveedores: [],
    });
  }

  const producto = productosPorClave.get(clave);
  if (!producto.codigoOriginal && fila.codigoOriginal) {
    producto.codigoOriginal = fila.codigoOriginal;
  }
  producto.proveedores.push({
    nombre: fila.importador || PROVEEDOR_RELLENO,
    codigo: fila.codigoImportador || null,
    costo: fila.costo,
    venta: fila.venta,
    stock: fila.stock,
    fecha: fila.fecha,
  });
}

const productos = [...productosPorClave.values()];

// --- Resumen ---
console.log("=== Resumen de importación ===");
console.log("Filas de datos procesadas:", filasProcesadas.length);
console.log("Filas descartadas (sin Artículo):", filasSinArticulo);
console.log("Productos únicos a crear:", productos.length);
console.log(
  "Proveedores con nombre de relleno:",
  filasProcesadas.filter((f) => !f.importador).length
);
const porCategoria = productos.reduce((acc, p) => {
  acc[p.categoria] = (acc[p.categoria] || 0) + 1;
  return acc;
}, {});
console.log("Por categoría:", porCategoria);
console.log("\nEjemplo de 2 productos armados:");
console.log(JSON.stringify(productos[0], null, 2));
console.log(JSON.stringify(productos[Math.floor(productos.length / 2)], null, 2));

if (!ESCRIBIR) {
  console.log("\n(Modo simulación — no se escribió nada en Firestore. Ejecuta con --escribir para importar de verdad.)");
  process.exit(0);
}

// --- Escribir en Firestore ---
initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))),
});
const db = getFirestore();

async function sincronizarCatalogo(coleccion, valores) {
  const existentesSnap = await db.collection(coleccion).get();
  const existentes = new Set(existentesSnap.docs.map((d) => d.data().nombre));
  const nuevos = [...new Set(valores)].filter((v) => v && !existentes.has(v));
  const batchesCatalogo = [];
  for (let i = 0; i < nuevos.length; i += 500) {
    const batch = db.batch();
    for (const nombre of nuevos.slice(i, i + 500)) {
      batch.set(db.collection(coleccion).doc(), { nombre });
    }
    batchesCatalogo.push(batch.commit());
  }
  await Promise.all(batchesCatalogo);
  console.log(`Catálogo "${coleccion}": ${nuevos.length} valores nuevos agregados.`);
}

console.log("\nSincronizando catálogos (marcas, tipos, proveedores)...");
await sincronizarCatalogo("marcasRepuesto", productos.map((p) => p.marcaRepuesto));
await sincronizarCatalogo("tiposRepuesto", productos.map((p) => p.tipoRepuesto).filter(Boolean));
await sincronizarCatalogo(
  "proveedores",
  productos.flatMap((p) => p.proveedores.map((prov) => prov.nombre))
);

console.log("\nEscribiendo productos en Firestore...");
let escritos = 0;
for (let i = 0; i < productos.length; i += 500) {
  const lote = productos.slice(i, i + 500);
  const batch = db.batch();
  for (const producto of lote) {
    const ref = db.collection("productos").doc();
    batch.set(ref, {
      ...producto,
      proveedores: producto.proveedores.map((p) => ({
        ...p,
        fecha: p.fecha ? Timestamp.fromDate(p.fecha) : null,
      })),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  escritos += lote.length;
  console.log(`  ${escritos}/${productos.length} productos escritos...`);
}

console.log("\n¡Listo! Importación completa.");
