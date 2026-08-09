import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const MULTIPROVEEDOR = process.argv.includes("--multiproveedor");
const nombreArchivo = process.argv.find((a) => a.endsWith(".docx"));
if (!nombreArchivo) {
  console.error(
    "Uso: node scripts/importar-facturas-proveedor.mjs <archivo.docx> [--escribir] [--multiproveedor]"
  );
  process.exit(1);
}

const rutaDocx = path.resolve("datos-privados", nombreArchivo);
const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

const carpetaTemp = fs.mkdtempSync(path.join(os.tmpdir(), "facturas-proveedor-"));
execSync(`unzip -o -q "${rutaDocx}" -d "${carpetaTemp}"`);
const xml = fs.readFileSync(path.join(carpetaTemp, "word", "document.xml"), "utf-8");

function textoDe(fragmento) {
  const matches = [...fragmento.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  return matches.map((m) => m[1]).join("").trim();
}

function parseFecha(texto) {
  const m = (texto || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let [, dia, mes, anio] = m;
  anio = Number(anio);
  if (anio < 100) anio += 2000;
  return new Date(anio, Number(mes) - 1, Number(dia));
}

function parseValor(texto) {
  if (!texto) return null;
  const soloDigitos = texto.replace(/[^\d]/g, "");
  if (!soloDigitos) return null;
  return Number(soloDigitos);
}

const filas = [...xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)];
const crudos = [];

for (const filaMatch of filas) {
  const celdas = [...filaMatch[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => textoDe(c[0]));
  const [fechaTexto, pagadoTexto, proveedor, numeroFactura, valorTexto] = celdas;

  const fecha = parseFecha(fechaTexto);
  if (!fecha) continue; // se saltan encabezados, filas vacias y filas TOTAL

  crudos.push({
    fecha,
    fechaPago: parseFecha(pagadoTexto),
    proveedor: (proveedor || "").trim(),
    numeroFactura: (numeroFactura || "").trim(),
    valor: parseValor(valorTexto),
  });
}

// El nombre de proveedor a veces viene con capitalización distinta en distintas
// filas del mismo archivo (ej. "Gam" y "GAM") — se usa el más frecuente para
// que todas las filas del archivo queden bajo un solo nombre de proveedor.
// Con --multiproveedor (archivos tipo "Varios" con proveedores distintos
// mezclados) se respeta el nombre de cada fila tal cual está escrito.
const conteoNombres = new Map();
crudos.forEach((r) => {
  if (!r.proveedor) return;
  conteoNombres.set(r.proveedor, (conteoNombres.get(r.proveedor) || 0) + 1);
});
const nombreCanonico = [...conteoNombres.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
if (!MULTIPROVEEDOR && conteoNombres.size > 1) {
  console.log(
    `⚠ El proveedor aparece escrito de ${conteoNombres.size} formas distintas: ${[...conteoNombres.keys()].join(", ")} — se usa "${nombreCanonico}" para todas.\n`
  );
}

const sinValor = crudos.filter((r) => r.valor === null);
if (sinValor.length > 0) {
  console.log(`⚠ ${sinValor.length} fila(s) sin valor cargado, se excluyen de la importación:`);
  sinValor.forEach((r) =>
    console.log(`  - ${r.fecha.toLocaleDateString("es-CL")} — N° ${r.numeroFactura}`)
  );
  console.log("");
}

const registros = crudos
  .filter((r) => r.valor !== null)
  .map((r) => (MULTIPROVEEDOR ? r : { ...r, proveedor: nombreCanonico }));

console.log(`Facturas a importar: ${registros.length}\n`);
registros.forEach((r) =>
  console.log(
    `  - ${r.fecha.toLocaleDateString("es-CL")} — ${r.proveedor} — N° ${r.numeroFactura} — ${r.valor}`
  )
);

const total = registros.reduce((acc, r) => acc + (r.valor || 0), 0);
console.log(`\nTotal: ${total}`);

if (!ESCRIBIR) {
  console.log("\n(Modo simulación — no se escribió nada. Ejecuta con --escribir para aplicar.)");
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

for (let i = 0; i < registros.length; i += 500) {
  const batch = db.batch();
  for (const r of registros.slice(i, i + 500)) {
    const ref = db.collection("facturasProveedor").doc();
    batch.set(ref, {
      fecha: Timestamp.fromDate(r.fecha),
      fechaPago: r.fechaPago ? Timestamp.fromDate(r.fechaPago) : null,
      proveedor: r.proveedor,
      numeroFactura: r.numeroFactura || null,
      valor: r.valor,
      importadoHistorico: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

console.log("\n¡Listo!");
