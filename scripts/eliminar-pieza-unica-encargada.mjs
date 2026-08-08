import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db
  .collection("productos")
  .where("tipoInventario", "==", "pieza_unica_encargada")
  .get();

console.log(`Productos "pieza_unica_encargada" encontrados: ${snap.size}`);
snap.docs.forEach((doc) => {
  console.log(`  - ${doc.id}: ${doc.data().nombre}`);
});

if (!ESCRIBIR) {
  console.log("\n(Modo simulación — no se borró nada. Ejecuta con --escribir para aplicar.)");
  process.exit(0);
}

const batch = db.batch();
snap.docs.forEach((doc) => batch.delete(doc.ref));
await batch.commit();

console.log("\n¡Listo! Productos de prueba eliminados.");
