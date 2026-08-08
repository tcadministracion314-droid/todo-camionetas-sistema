import { useMemo } from "react";
import { METODOS_PAGO } from "../../lib/constants";
import { formatoCLP } from "../../lib/format";
import { totalActivoVenta } from "../../lib/calculosVenta";

export default function TabCaja({ ventas }) {
  const resumen = useMemo(() => {
    const porMetodo = Object.fromEntries(METODOS_PAGO.map((m) => [m.value, 0]));
    let totalGeneral = 0;
    let totalDescuentos = 0;
    let cantidadAnuladas = 0;
    let totalDevuelto = 0;

    ventas.forEach((v) => {
      const total = totalActivoVenta(v);
      totalGeneral += total;
      if (porMetodo[v.metodoPago] !== undefined) porMetodo[v.metodoPago] += total;
      totalDescuentos += v.descuentoMonto || 0;

      (v.items || []).forEach((it) => {
        if (it.estado === "anulado") {
          cantidadAnuladas++;
          totalDevuelto += it.montoDevuelto || 0;
        }
      });
    });

    return { porMetodo, totalGeneral, totalDescuentos, cantidadAnuladas, totalDevuelto };
  }, [ventas]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {METODOS_PAGO.map((m) => (
          <div key={m.value} className="border-2 border-marca-azul p-4">
            <p className="text-sm font-black uppercase text-marca-azul/70">{m.label}</p>
            <p className="text-2xl font-black text-marca-azul">
              {formatoCLP(resumen.porMetodo[m.value])}
            </p>
          </div>
        ))}
      </div>

      <div className="border-2 border-marca-rojo p-4">
        <p className="text-sm font-black uppercase text-marca-rojo">Total del período</p>
        <p className="text-3xl font-black text-marca-azul">
          {formatoCLP(resumen.totalGeneral)}
        </p>
        <p className="mt-1 text-sm text-marca-azul/70">{ventas.length} venta(s)</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border-2 border-marca-azul/30 p-4">
          <p className="text-sm font-black uppercase text-marca-azul/70">
            Descuentos otorgados
          </p>
          <p className="text-xl font-black text-marca-azul">
            {formatoCLP(resumen.totalDescuentos)}
          </p>
        </div>
        <div className="border-2 border-marca-azul/30 p-4">
          <p className="text-sm font-black uppercase text-marca-azul/70">
            Devoluciones del período
          </p>
          <p className="text-xl font-black text-marca-azul">
            {resumen.cantidadAnuladas} producto(s) — {formatoCLP(resumen.totalDevuelto)}
          </p>
        </div>
      </div>
    </div>
  );
}
