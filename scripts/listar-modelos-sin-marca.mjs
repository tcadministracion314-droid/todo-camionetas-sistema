import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db.collection("productos").get();
const sinMarca = snap.docs.filter((d) => !d.data().marcaVehiculo);
console.log(`Productos sin marca de vehiculo: ${sinMarca.length}\n`);

const modelosUnicos = new Map();
sinMarca.forEach((d) => {
  const modelo = (d.data().modelo || "").trim();
  if (!modelo) return;
  modelosUnicos.set(modelo, (modelosUnicos.get(modelo) || 0) + 1);
});

console.log(`Modelos distintos (no vacios): ${modelosUnicos.size}\n`);
[...modelosUnicos.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([modelo, cant]) => console.log(`${cant}\t${modelo}`));
