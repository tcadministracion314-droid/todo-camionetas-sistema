import * as XLSX from "@e965/xlsx";
import { TIPOS_INVENTARIO } from "./constants";

function fechaATexto(fecha) {
  if (!fecha) return "";
  const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
  return date.toLocaleDateString("es-CL");
}

function etiquetaTipoInventario(valor) {
  return TIPOS_INVENTARIO.find((t) => t.value === valor)?.label ?? valor;
}

export function exportarProductosAExcel(productos) {
  const filas = productos.flatMap((p) => {
    const proveedores = p.proveedores?.length > 0 ? p.proveedores : [{}];

    return proveedores.map((prov) => ({
      Artículo: p.nombre,
      "Marca del repuesto": p.marcaRepuesto || "",
      "Marca del vehículo": p.marcaVehiculo || "",
      Modelo: p.modelo || "",
      "Año desde": p.anioDesde ?? "",
      "Año hasta": p.anioHasta ?? "",
      Categoría: p.categoria || "",
      Subcategoría: p.subcategoria || "",
      "Tipo de repuesto": p.tipoRepuesto || "",
      "Glosa técnica": p.glosaTecnica || "",
      Proveedor: prov.nombre || "",
      "Código proveedor": prov.codigo || "",
      "Código original": p.codigoOriginal || "",
      Costo: prov.costo ?? "",
      Venta: prov.venta ?? "",
      Stock: prov.stock ?? "",
      "Fecha ingreso": fechaATexto(prov.fecha),
      "Tipo de inventario": etiquetaTipoInventario(p.tipoInventario),
    }));
  });

  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Inventario");

  const fechaArchivo = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `inventario-todo-camionetas-${fechaArchivo}.xlsx`);
}
