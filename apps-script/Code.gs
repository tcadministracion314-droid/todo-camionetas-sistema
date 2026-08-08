const FIREBASE_PROJECT_ID = "gestion-de-ventas-c5cf8";
const NOMBRE_HOJA = "Inventario";

function respaldarInventario() {
  const token = ScriptApp.getOAuthToken();
  const productos = obtenerTodosLosProductos(token);
  escribirEnHoja(productos);
}

function obtenerTodosLosProductos(token) {
  let productos = [];
  let pageToken = null;

  do {
    let url =
      "https://firestore.googleapis.com/v1/projects/" +
      FIREBASE_PROJECT_ID +
      "/databases/(default)/documents/productos?pageSize=300";
    if (pageToken) url += "&pageToken=" + pageToken;

    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true,
    });

    const data = JSON.parse(response.getContentText());
    if (data.error) {
      throw new Error(
        "Error de Firestore: " + data.error.status + " - " + data.error.message
      );
    }

    if (data.documents) {
      productos = productos.concat(data.documents.map(parsearDocumento));
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return productos;
}

function valorFirestore(v) {
  if (v === undefined || v === null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return parsearMapa(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(valorFirestore);
  return null;
}

function parsearMapa(fields) {
  const obj = {};
  for (const clave in fields) obj[clave] = valorFirestore(fields[clave]);
  return obj;
}

function parsearDocumento(doc) {
  return parsearMapa(doc.fields || {});
}

function escribirEnHoja(productos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(NOMBRE_HOJA);
  if (!hoja) hoja = ss.insertSheet(NOMBRE_HOJA);
  hoja.clearContents();

  const encabezados = [
    "Artículo",
    "Marca del repuesto",
    "Marca del vehículo",
    "Modelo",
    "Año desde",
    "Año hasta",
    "Categoría",
    "Subcategoría",
    "Tipo de repuesto",
    "Glosa técnica",
    "Proveedor",
    "Código proveedor",
    "Código original",
    "Costo",
    "Venta",
    "Stock",
    "Fecha ingreso",
    "Tipo de inventario",
  ];
  const filas = [encabezados];

  productos.forEach((p) => {
    const proveedores = p.proveedores && p.proveedores.length ? p.proveedores : [{}];
    proveedores.forEach((prov) => {
      filas.push([
        p.nombre || "",
        p.marcaRepuesto || "",
        p.marcaVehiculo || "",
        p.modelo || "",
        p.anioDesde != null ? p.anioDesde : "",
        p.anioHasta != null ? p.anioHasta : "",
        p.categoria || "",
        p.subcategoria || "",
        p.tipoRepuesto || "",
        p.glosaTecnica || "",
        prov.nombre || "",
        prov.codigo || "",
        p.codigoOriginal || "",
        prov.costo != null ? prov.costo : "",
        prov.venta != null ? prov.venta : "",
        prov.stock != null ? prov.stock : "",
        prov.fecha || "",
        p.tipoInventario || "",
      ]);
    });
  });

  hoja.getRange(1, 1, filas.length, encabezados.length).setValues(filas);
  hoja.getRange(1, 1, 1, encabezados.length).setFontWeight("bold");
  hoja.setFrozenRows(1);

  hoja.getRange(1, encabezados.length + 2).setValue("Última actualización:");
  hoja.getRange(1, encabezados.length + 3).setValue(new Date());
}

function crearDisparadorDiario() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === "respaldarInventario") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("respaldarInventario")
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
}
