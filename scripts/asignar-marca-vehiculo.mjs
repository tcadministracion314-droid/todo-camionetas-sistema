import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

const REGLAS = [
  { palabras: ["hilux"], marca: "Toyota" },
  { palabras: ["l200"], marca: "Mitsubishi" },
  { palabras: ["dmax", "d-max", "luv", "silverado"], marca: "Chevrolet" },
  { palabras: ["navara", "np300", "d21", "terrano", "d22"], marca: "Nissan" },
  { palabras: ["bt50", "bt-50"], marca: "Mazda" },
];

function marcaParaModelo(modelo) {
  const m = (modelo || "").toLowerCase();
  for (const regla of REGLAS) {
    if (regla.palabras.some((p) => m.includes(p))) return regla.marca;
  }
  return null;
}

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db.collection("productos").get();
console.log(`Productos revisados: ${snap.size}`);

const aActualizar = [];
snap.docs.forEach((doc) => {
  const p = doc.data();
  if (p.marcaVehiculo) return; // ya tiene marca cargada, no se toca
  const marca = marcaParaModelo(p.modelo);
  if (marca) aActualizar.push({ ref: doc.ref, nombre: p.nombre, modelo: p.modelo, marca });
});

console.log(`\nProductos a actualizar: ${aActualizar.length}`);
const porMarca = {};
aActualizar.forEach((p) => (porMarca[p.marca] = (porMarca[p.marca] || 0) + 1));
console.log(porMarca);

console.log("\nEjemplos (primeros 15):");
aActualizar.slice(0, 15).forEach((p) => console.log(`  - "${p.nombre}" (modelo "${p.modelo}") → ${p.marca}`));

if (!ESCRIBIR) {
  console.log("\n(Modo simulación — no se escribió nada. Ejecuta con --escribir para aplicar.)");
  process.exit(0);
}

for (let i = 0; i < aActualizar.length; i += 500) {
  const batch = db.batch();
  for (const p of aActualizar.slice(i, i + 500)) {
    batch.update(p.ref, { marcaVehiculo: p.marca, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`  ${Math.min(i + 500, aActualizar.length)}/${aActualizar.length} actualizados...`);
}

console.log("\n¡Listo!");
