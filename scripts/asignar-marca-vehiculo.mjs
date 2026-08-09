import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

const REGLAS = [
  {
    palabras: ["hilux", "hilix", "hulux", "yaris", "corolla", "tercel", "rav4", "tundra", "toyota"],
    marca: "Toyota",
  },
  { palabras: ["l200", "l300", "outlander"], marca: "Mitsubishi" },
  {
    palabras: [
      "dmax", "luv", "silverado", "s10", "corsa", "tracker", "chevette", "montana",
      "clarus", "spark", "groove", "sail", "aveo", "captiva", "chevrolet", "n300",
    ],
    marca: "Chevrolet",
  },
  {
    palabras: [
      "navara", "np300", "d21", "terrano", "d22", "j18", "720", "xtrail", "xtrai",
      "qashqai", "sentra", "nv350", "v16", "j16", "j15", "nissan",
    ],
    marca: "Nissan",
  },
  {
    palabras: [
      "bt50", "bt5o", "b2500", "b2900", "b2000", "b2200", "b2600", "mazda",
    ],
    marca: "Mazda",
  },
  { palabras: ["ranger", "f150", "ford"], marca: "Ford" },
  { palabras: ["porter", "h100", "h1", "pregio", "hyundai"], marca: "Hyundai" },
  { palabras: ["nkr", "npr"], marca: "Isuzu" },
  { palabras: ["maxus"], marca: "Maxus" },
  { palabras: ["baleno", "swift"], marca: "Suzuki" },
  { palabras: ["poer"], marca: "Great Wall" },
  { palabras: ["byd"], marca: "BYD" },
  { palabras: ["ssangyong"], marca: "SsangYong" },
  { palabras: ["vwgol", "volkswagen"], marca: "Volkswagen" },
  { palabras: ["oroch"], marca: "Renault" },
  { palabras: ["kia"], marca: "Kia" },
];

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^a-z0-9]/g, ""); // quita espacios, guiones, puntos, etc.
}

function marcaParaModelo(modelo) {
  const m = normalizar(modelo);
  for (const regla of REGLAS) {
    if (regla.palabras.some((p) => m.includes(normalizar(p)))) return regla.marca;
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

console.log("\nEjemplos (primeros 20):");
aActualizar.slice(0, 20).forEach((p) => console.log(`  - "${p.nombre}" (modelo "${p.modelo}") → ${p.marca}`));

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
