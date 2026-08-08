import { useMemo } from "react";
import { formatoCLP } from "../../lib/format";

function formatoFechaHora(fecha) {
  if (!fecha?.toDate) return "";
  return fecha.toDate().toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TabVentas({ ventas }) {
  const productosVendidos = useMemo(() => {
    const porProducto = new Map();
    ventas.forEach((v) => {
      (v.items || [])
        .filter((it) => it.estado !== "anulado")
        .forEach((it) => {
          const actual = porProducto.get(it.productoNombre) || { cantidad: 0, monto: 0 };
          actual.cantidad += it.cantidad;
          actual.monto += it.subtotal;
          porProducto.set(it.productoNombre, actual);
        });
    });
    return [...porProducto.entries()]
      .map(([nombre, datos]) => ({ nombre, ...datos }))
      .sort((a, b) => b.monto - a.monto);
  }, [ventas]);

  const ventasOrdenadas = useMemo(
    () =>
      [...ventas].sort(
        (a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0)
      ),
    [ventas]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Productos vendidos ({productosVendidos.length})
        </h2>
        <div className="overflow-x-auto border-2 border-marca-azul">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-marca-azul text-white">
                <th className="p-2">Producto</th>
                <th className="p-2">Cantidad</th>
                <th className="p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {productosVendidos.map((p) => (
                <tr key={p.nombre} className="border-t border-marca-azul/20">
                  <td className="p-2 font-bold">{p.nombre}</td>
                  <td className="p-2">{p.cantidad}</td>
                  <td className="p-2">{formatoCLP(p.monto)}</td>
                </tr>
              ))}
              {productosVendidos.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-marca-azul/70">
                    Sin ventas en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Ventas del período ({ventasOrdenadas.length})
        </h2>
        <div className="max-h-[32rem] space-y-2 overflow-y-auto">
          {ventasOrdenadas.map((v) => (
            <div key={v.id} className="border-2 border-marca-azul/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-marca-azul">
                  {formatoFechaHora(v.fecha)}
                </span>
                <span className="font-black text-marca-azul">{formatoCLP(v.total)}</span>
              </div>
              <p className="text-marca-azul/70">
                {v.vendedorEmail} — {(v.items || []).map((it) => it.productoNombre).join(", ")}
              </p>
            </div>
          ))}
          {ventasOrdenadas.length === 0 && (
            <p className="text-marca-azul/70">Sin ventas en este período.</p>
          )}
        </div>
      </div>
    </div>
  );
}
