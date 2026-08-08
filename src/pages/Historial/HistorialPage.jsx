import { useState } from "react";
import { useCotizaciones } from "../../hooks/useCotizaciones";
import { useEncargos } from "../../hooks/useEncargos";
import { formatoCLP } from "../../lib/format";
import CotizacionImprimibleModal from "./CotizacionImprimibleModal";

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

function formatoFecha(fecha) {
  if (!fecha?.toDate) return "";
  return fecha.toDate().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function totalCotizacion(cotizacion) {
  return (cotizacion.items || []).reduce(
    (acc, it) => acc + (it.precioSugerido || 0) * it.cantidad,
    0
  );
}

const ESTADOS_ENCARGO = {
  pendiente: "Pendiente",
  llego: "Llegó",
  entregado: "Entregado",
};

function TarjetaCotizaciones() {
  const { cotizaciones, loading } = useCotizaciones();
  const [verCotizacion, setVerCotizacion] = useState(null);

  return (
    <div className="border-2 border-marca-azul p-4">
      <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">Cotizaciones</h2>
      {loading ? (
        <p className="font-bold text-marca-azul">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {cotizaciones.length === 0 && (
            <p className="text-marca-azul/70">Todavía no hay cotizaciones.</p>
          )}
          {cotizaciones.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-2 border-marca-azul/30 p-3"
            >
              <div>
                <p className="font-bold text-marca-azul">
                  {c.clienteNombre || "Sin datos de cliente"}
                </p>
                <p className="text-sm text-marca-azul/70">
                  {formatoFechaHora(c.fecha)} — {(c.items || []).length} producto(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-black text-marca-azul">
                  {formatoCLP(totalCotizacion(c))}
                </p>
                <button
                  type="button"
                  onClick={() => setVerCotizacion(c)}
                  className="text-sm font-bold text-marca-azul hover:underline"
                >
                  Ver / Imprimir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {verCotizacion && (
        <CotizacionImprimibleModal
          cotizacion={verCotizacion}
          onClose={() => setVerCotizacion(null)}
        />
      )}
    </div>
  );
}

function TarjetaVentaPorEncargo() {
  const { encargos, loading } = useEncargos();

  return (
    <div className="border-2 border-marca-azul p-4">
      <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
        Venta por encargo
      </h2>
      {loading ? (
        <p className="font-bold text-marca-azul">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {encargos.length === 0 && (
            <p className="text-marca-azul/70">Todavía no hay ventas por encargo.</p>
          )}
          {encargos.map((e) => {
            const saldoPendiente = Math.max(0, (e.precioTotal || 0) - (e.montoAbonado || 0));
            return (
              <div key={e.id} className="border-2 border-marca-azul/30 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-marca-azul">{e.descripcionProducto}</p>
                    <p className="text-sm text-marca-azul/70">
                      {e.clienteNombre || "Sin datos de cliente"}
                      {e.proveedor ? ` — ${e.proveedor}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-black uppercase text-marca-azul">
                    {ESTADOS_ENCARGO[e.estado] || e.estado}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <p className="text-marca-azul/70">
                    Llegada estimada: {formatoFecha(e.fechaEstimadaLlegada) || "—"}
                  </p>
                  <div className="text-right">
                    <p className="font-bold text-marca-azul">
                      {formatoCLP(e.precioTotal)}
                    </p>
                    <p className="text-marca-azul/70">
                      {saldoPendiente > 0
                        ? `Saldo pendiente: ${formatoCLP(saldoPendiente)}`
                        : "Pagado"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HistorialPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-black uppercase text-marca-azul">Historial</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TarjetaCotizaciones />
        <TarjetaVentaPorEncargo />
      </div>
    </div>
  );
}
