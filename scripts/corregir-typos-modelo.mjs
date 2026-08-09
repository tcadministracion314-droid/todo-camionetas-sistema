import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

const CORRECCIONES = [
  { patron: /hulux/gi, reemplazo: "Hilux" },
  { patron: /hilix/gi, reemplazo: "Hilux" },
  { patron: /bt5o/gi, reemplazo: "BT50" },
];

function corregir(modelo) {
  if (!modelo) return null;
  let corregido = modelo;
  for (const { patron, reemplazo } of CORRECCIONES) {
    corregido = corregido.replace(patron, reemplazo);
  }
  return corregido !== modelo ? corregido : null;
}

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db.collection("productos").get();
console.log(`Productos revisados: ${snap.size}`);

const aCorregir = [];
snap.docs.forEach((doc) => {
  const p = doc.data();
  const corregido = corregir(p.modelo);
  if (corregido) aCorregir.push({ ref: doc.ref, nombre: p.nombre, antes: p.modelo, despues: corregido });
});

console.log(`\nProductos con modelo a corregir: ${aCorregir.length}\n`);
aCorregir.forEach((p) => console.log(`  - "${p.nombre}": "${p.antes}" → "${p.despues}"`));

if (!ESCRIBIR) {
  console.log("\n(Modo simulación — no se escribió nada. Ejecuta con --escribir para aplicar.)");
  process.exit(0);
}

for (let i = 0; i < aCorregir.length; i += 500) {
  const batch = db.batch();
  for (const p of aCorregir.slice(i, i + 500)) {
    batch.update(p.ref, { modelo: p.despues, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`  ${Math.min(i + 500, aCorregir.length)}/${aCorregir.length} actualizados...`);
}

console.log("\n¡Listo!");
