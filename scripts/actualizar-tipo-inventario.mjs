import * as XLSX from "@e965/xlsx";
import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const SECCION_ACCESORIOS = "accesorios y aditivos";

const carpeta = path.resolve("datos-privados");
const archivoExcel = fs.readdirSync(carpeta).find((f) => f.toLowerCase().endsWith(".xlsx"));
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
    return { desde: izq ? expandirAnio(izq) : null, hasta: der ? expandirAnio(der) : null };
  }
  return { desde: null, hasta: null };
}
function numeroONull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

const buffer = fs.readFileSync(rutaExcel);
const libro = XLSX.read(buffer, { type: "buffer", cellStyles: true });
const hoja = libro.Sheets[libro.SheetNames[0]];
const rango = XLSX.utils.decode_range(hoja["!ref"]);

const COLORES_VERDE = new Set(["00FF00", "CCFF32"]);
function filaEsVerde(r) {
  const celda = hoja[XLSX.utils.encode_cell({ r, c: 0 })];
  const fill = celda?.s?.fgColor || celda?.s?.bgColor;
  return fill?.rgb ? COLORES_VERDE.has(fill.rgb) : false;
}

const origenPorCelda = new Map();
for (const m of hoja["!merges"] || []) {
  const origen = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
  for (let r = m.s.r; r <= m.e.r; r++) {
    for (let c = m.s.c; c <= m.e.c; c++) origenPorCelda.set(XLSX.utils.encode_cell({ r, c }), origen);
  }
}
function valorCelda(r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const celda = hoja[origenPorCelda.get(addr) || addr];
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

const productosPorClave = new Map();
let seccionActual = null;

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

  const [articulo, , , , marca, , , , modelo, , , anio] = vals;
  const stock = numeroONull(vals[18]);
  if (!articulo || !limpiarEspacios(articulo)) continue;

  const articuloL = limpiarEspacios(articulo);
  const marcaL = limpiarEspacios(marca) || "Sin marca";
  const modeloL = limpiarEspacios(modelo);
  const anioTexto = limpiarEspacios(anio);
  const { desde, hasta } = parsearRangoAnio(anioTexto);

  const claveGrupo = [articuloL, marcaL, modeloL, anioTexto].map((v) => v.toLowerCase()).join("|");
  if (!productosPorClave.has(claveGrupo)) {
    const esAccesorio = seccionActual?.toLowerCase().replace(/[.\s]+$/, "").startsWith(SECCION_ACCESORIOS);
    productosPorClave.set(claveGrupo, {
      claveMatch: [articuloL, marcaL, modeloL, desde ?? "", hasta ?? ""].map((v) => String(v).toLowerCase()).join("|"),
      categoria: esAccesorio ? "accesorio" : "repuesto",
      _puedeSerProyectado: true,
    });
  }
  const p = productosPorClave.get(claveGrupo);
  if (filaEsVerde(r) || stock !== null) p._puedeSerProyectado = false;
}

const debenSerProyectado = new Map();
for (const p of productosPorClave.values()) {
  if (p._puedeSerProyectado) debenSerProyectado.set(p.claveMatch, true);
}

console.log("Total productos que deberían quedar en 'proyectado':", debenSerProyectado.size);

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db.collection("productos").get();
console.log("Productos existentes en Firestore:", snap.size);

let coincidencias = 0;
const docsAActualizar = [];

for (const doc of snap.docs) {
  const d = doc.data();
  const claveMatch = [d.nombre, d.marcaRepuesto, d.modelo || "", d.anioDesde ?? "", d.anioHasta ?? ""]
    .map((v) => String(v).toLowerCase())
    .join("|");
  if (debenSerProyectado.has(claveMatch)) {
    coincidencias++;
    docsAActualizar.push(doc.ref);
  }
}
const sinCoincidencia = debenSerProyectado.size - coincidencias;

console.log("Coincidencias encontradas en Firestore:", coincidencias);
console.log("Sin coincidencia (revisar manualmente si es mayor a 0):", sinCoincidencia);

if (!ESCRIBIR) {
  console.log("\n(Modo simulación — no se escribió nada. Ejecuta con --escribir para aplicar los cambios en Firestore.)");
  process.exit(0);
}

for (let i = 0; i < docsAActualizar.length; i += 500) {
  const batch = db.batch();
  for (const ref of docsAActualizar.slice(i, i + 500)) {
    batch.update(ref, { tipoInventario: "proyectado", updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`  ${Math.min(i + 500, docsAActualizar.length)}/${docsAActualizar.length} actualizados...`);
}

console.log("\n¡Listo! Actualización completa.");
