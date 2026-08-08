import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db.collection("clientes").get();
console.log(`Clientes encontrados: ${snap.size}`);
snap.docs.forEach((doc) => {
  const d = doc.data();
  console.log(`  - ${doc.id}: ${d.nombre || "(sin nombre)"} — ${d.telefono || "(sin teléfono)"} — saldoAFavor: ${d.saldoAFavor || 0}`);
});
