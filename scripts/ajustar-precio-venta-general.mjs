import path from "node:path";
import fs from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const MULTIPLICADOR = 2.3;
const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();

const snap = await db.collection("productos").get();
console.log(`Productos revisados: ${snap.size}`);

const aActualizar = [];
snap.docs.forEach((doc) => {
  const p = doc.data();
  const proveedores = p.proveedores || [];
  let cambia = false;
  const nuevosProveedores = proveedores.map((prov) => {
    if (prov.costo) {
      const nuevaVenta = Math.round(prov.costo * MULTIPLICADOR);
      if (nuevaVenta !== prov.venta) {
        cambia = true;
        return { ...prov, venta: nuevaVenta };
      }
    }
    return prov;
  });
  if (cambia) {
    aActualizar.push({ ref: doc.ref, nombre: p.nombre, antes: proveedores, despues: nuevosProveedores });
  }
});

console.log(`\nProductos con al menos un precio de venta a recalcular: ${aActualizar.length}\n`);

aActualizar.slice(0, 15).forEach((p) => {
  p.despues.forEach((prov, i) => {
    if (prov.venta !== p.antes[i].venta) {
      console.log(
        `  - "${p.nombre}" — ${prov.nombre}: costo ${prov.costo} — venta ${p.antes[i].venta ?? "(vacío)"} → ${prov.venta}`
      );
    }
  });
});
if (aActualizar.length > 15) console.log(`  ... y ${aActualizar.length - 15} producto(s) más`);

if (!ESCRIBIR) {
  console.log("\n(Modo simulación — no se escribió nada. Ejecuta con --escribir para aplicar.)");
  process.exit(0);
}

for (let i = 0; i < aActualizar.length; i += 500) {
  const batch = db.batch();
  for (const p of aActualizar.slice(i, i + 500)) {
    batch.update(p.ref, { proveedores: p.despues, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`  ${Math.min(i + 500, aActualizar.length)}/${aActualizar.length} actualizados...`);
}

console.log("\n¡Listo!");
