import * as XLSX from "@e965/xlsx";
import path from "node:path";
import fs from "node:fs";

const carpeta = path.resolve("datos-privados");
const archivo = fs.readdirSync(carpeta).find((f) => f.toLowerCase().endsWith(".xlsx"));
const RUTA = path.join(carpeta, archivo);

const buffer = fs.readFileSync(RUTA);
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

const seccionesEncontradas = [];
let filaHeaderRepetido = 0;
let filaVacia = 0;
let filaDatos = 0;
let seccionActual = null;
let contadorSeccionActual = 0;

for (let r = rango.s.r; r <= rango.e.r; r++) {
  const vals = filaCompleta(r);
  const nn = noNulos(vals);
  const primero = vals[0] ? String(vals[0]).trim() : "";

  if (nn === 0) {
    filaVacia++;
    continue;
  }

  if (nn === 1 && primero) {
    // Fila con un solo valor: probablemente titulo de seccion
    if (seccionActual !== null) {
      seccionesEncontradas.push({ titulo: seccionActual, filas: contadorSeccionActual, desdeExcelRow: null });
    }
    seccionActual = primero;
    contadorSeccionActual = 0;
    continue;
  }

  if (primero === "Artículo") {
    filaHeaderRepetido++;
    continue;
  }

  filaDatos++;
  contadorSeccionActual++;
}
if (seccionActual !== null) {
  seccionesEncontradas.push({ titulo: seccionActual, filas: contadorSeccionActual });
}

console.log("Total filas hoja:", rango.e.r - rango.s.r + 1);
console.log("Filas vacías:", filaVacia);
console.log("Filas de encabezado repetido (Artículo...):", filaHeaderRepetido);
console.log("Filas de datos reales:", filaDatos);
console.log("\nSecciones encontradas:", seccionesEncontradas.length);
for (const s of seccionesEncontradas) {
  console.log(`  - "${s.titulo}" -> ${s.filas} filas de datos`);
}

console.log("\nMuestra de 3 filas de datos reales:");
let muestras = 0;
for (let r = rango.s.r; r <= rango.e.r && muestras < 3; r++) {
  const vals = filaCompleta(r);
  const nn = noNulos(vals);
  const primero = vals[0] ? String(vals[0]).trim() : "";
  if (nn > 1 && primero !== "Artículo") {
    console.log(`Fila Excel ${r + 1}:`, vals);
    muestras++;
  }
}
