import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db.collection("encargos").where("estado", "!=", "entregado").get();
console.log(`Encargos no entregados: ${snap.size}`);
snap.docs.forEach((doc) => {
  const d = doc.data();
  console.log(`  - ${doc.id}: estado=${d.estado} — "${d.descripcionProducto}" — cliente=${d.clienteNombre || "(sin nombre)"} — importadoHistorico=${!!d.importadoHistorico}`);
});
