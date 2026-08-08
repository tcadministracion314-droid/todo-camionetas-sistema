import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ESCRIBIR = process.argv.includes("--escribir");
const rutaDocx = path.resolve("datos-privados", "LISTADO CLIENTES.docx");
const rutaCredenciales = path.resolve("datos-privados", "firebase-service-account.json");

const carpetaTemp = fs.mkdtempSync(path.join(os.tmpdir(), "listado-clientes-"));
execSync(`unzip -o -q "${rutaDocx}" -d "${carpetaTemp}"`);
const xml = fs.readFileSync(path.join(carpetaTemp, "word", "document.xml"), "utf-8");

function textoDe(fragmento) {
  const matches = [...fragmento.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  return matches.map((m) => m[1]).join("").trim();
}

function parseValor(texto) {
  if (!texto) return null;
  const soloDigitos = texto.replace(/[^\d]/g, "");
  if (!soloDigitos) return null;
  return Number(soloDigitos);
}

function bucketMotivo(motivo) {
  const m = (motivo || "").trim().toLowerCase();
  if (["cotización", "cotizacion", "pedir", "buscar"].includes(m)) return "cotizacion";
  return "encargo";
}

const filas = [...xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)];
const registros = [];

for (const filaMatch of filas) {
  const celdas = [...filaMatch[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => textoDe(c[0]));
  const [nombre, telefono, marca, modelo, anio, repuesto, motivo, valor] = celdas;

  if (nombre === "Nombre Cliente") continue; // fila de encabezado
  if (!nombre && !telefono && !repuesto) continue; // fila vacía

  registros.push({
    nombre: nombre || "",
    telefono: (telefono || "").trim(),
    vehiculoMarca: marca || "",
    vehiculoModelo: modelo || "",
    vehiculoAnio: anio ? Number(anio) : null,
    descripcionProducto: repuesto || "Repuesto sin especificar",
    valor: parseValor(valor),
    bucket: bucketMotivo(motivo),
  });
}

console.log(`Filas a importar: ${registros.length}\n`);

const telefonosSospechosos = registros.filter(
  (r) => r.telefono && r.telefono.replace(/\D/g, "").length > 9
);
if (telefonosSospechosos.length > 0) {
  console.log("⚠ Teléfonos con formato sospechoso (revisar manualmente después de importar):");
  telefonosSospechosos.forEach((r) => console.log(`  - "${r.nombre}": "${r.telefono}"`));
  console.log("");
}

const porBucket = { encargo: 0, cotizacion: 0 };
registros.forEach((r) => porBucket[r.bucket]++);
console.log(`Van a Historial → Venta por encargo: ${porBucket.encargo}`);
console.log(`Van a Historial → Cotizaciones: ${porBucket.cotizacion}\n`);

if (!ESCRIBIR) {
  console.log("Primeras 5 filas de ejemplo:");
  registros.slice(0, 5).forEach((r) => console.log("  ", JSON.stringify(r)));
  console.log("\n(Modo simulación — no se escribió nada. Ejecuta con --escribir para aplicar.)");
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCredenciales, "utf-8"))) });
const db = getFirestore();
const clientesRef = db.collection("clientes");

async function buscarOCrearCliente(nombre, telefono) {
  if (telefono) {
    const existentes = await clientesRef.where("telefono", "==", telefono).limit(1).get();
    if (!existentes.empty) return existentes.docs[0].id;
  }
  const nuevo = await clientesRef.add({
    nombre: nombre || "",
    telefono: telefono || null,
    correo: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return nuevo.id;
}

let creados = 0;
for (const r of registros) {
  const clienteId = await buscarOCrearCliente(r.nombre, r.telefono);

  if (r.bucket === "encargo") {
    await db.collection("encargos").add({
      clienteId,
      clienteNombre: r.nombre || null,
      clienteTelefono: r.telefono || null,
      clienteCorreo: null,
      vehiculoMarca: r.vehiculoMarca || null,
      vehiculoModelo: r.vehiculoModelo || null,
      vehiculoAnio: r.vehiculoAnio,
      descripcionProducto: r.descripcionProducto,
      marcaRepuesto: null,
      proveedor: null,
      costo: null,
      precioTotal: r.valor,
      montoAbonado: r.valor,
      metodoPagoAbono: null,
      estadoPago: "pagado",
      estado: "entregado",
      fechaEstimadaLlegada: null,
      vendedorId: null,
      vendedorEmail: "Importado desde listado histórico",
      importadoHistorico: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await db.collection("cotizaciones").add({
      clienteId,
      clienteNombre: r.nombre || null,
      clienteTelefono: r.telefono || null,
      clienteCorreo: null,
      items: [
        {
          vehiculoMarca: r.vehiculoMarca || null,
          vehiculoModelo: r.vehiculoModelo || null,
          vehiculoAnio: r.vehiculoAnio,
          descripcionProducto: r.descripcionProducto,
          marcaRepuesto: null,
          proveedor: null,
          costo: null,
          precioSugerido: r.valor,
          cantidad: 1,
        },
      ],
      notas: null,
      vendedorId: null,
      vendedorEmail: "Importado desde listado histórico",
      importadoHistorico: true,
      fecha: FieldValue.serverTimestamp(),
    });
  }
  creados++;
  if (creados % 20 === 0) console.log(`  ${creados}/${registros.length}...`);
}

console.log(`\n¡Listo! ${creados} registros importados.`);
