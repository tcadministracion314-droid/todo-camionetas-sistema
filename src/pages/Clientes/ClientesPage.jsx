import { useMemo, useState } from "react";
import { useClientes } from "../../hooks/useClientes";
import { useEncargos } from "../../hooks/useEncargos";
import { useCotizaciones } from "../../hooks/useCotizaciones";
import { formatoCLP } from "../../lib/format";

const ESTILO_ESTADO_ENCARGO = {
  pendiente: "bg-red-600 text-white",
  llego: "bg-yellow-400 text-marca-azul",
  entregado: "bg-green-600 text-white",
};

function formatoFecha(fecha) {
  if (!fecha) return "—";
  if (fecha?.toDate) {
    return fecha.toDate().toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return new Date(fecha).toLocaleDateString("es-CL", {
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

function FichaCliente({ cliente, encargos, cotizaciones }) {
  const saldoAFavor = cliente.saldoAFavor || 0;
  const movimientos = cliente.movimientosSaldo || [];

  return (
    <div className="space-y-4">
      <div className="border-2 border-marca-azul p-4">
        <p className="text-2xl font-black text-marca-azul">{cliente.nombre || "Sin nombre"}</p>
        <p className="text-marca-azul/70">
          {[cliente.telefono, cliente.correo].filter(Boolean).join(" — ") || "Sin datos de contacto"}
        </p>
      </div>

      <div className="border-2 border-marca-rojo p-4">
        <p className="text-sm font-black uppercase text-marca-rojo">Saldo a favor</p>
        <p className="text-3xl font-black text-marca-azul">{formatoCLP(saldoAFavor)}</p>
        {movimientos.length > 0 && (
          <div className="mt-3 space-y-1">
            {movimientos.map((m, i) => (
              <div key={i} className="flex justify-between text-sm text-marca-azul/70">
                <span>
                  {formatoFecha(m.fecha)} — {m.motivo}
                </span>
                <span className="font-bold">{formatoCLP(m.monto)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-2 border-marca-azul p-4">
        <p className="mb-2 text-sm font-black uppercase text-marca-azul">
          Cotizaciones ({cotizaciones.length})
        </p>
        {cotizaciones.length === 0 ? (
          <p className="text-sm text-marca-azul/70">Sin cotizaciones registradas.</p>
        ) : (
          <div className="space-y-2">
            {cotizaciones.map((c) => (
              <div key={c.id} className="flex justify-between border-t border-marca-azul/10 pt-2 text-sm">
                <span className="text-marca-azul/70">
                  {formatoFecha(c.fecha)} — {(c.items || []).length} producto(s)
                </span>
                <span className="font-bold text-marca-azul">{formatoCLP(totalCotizacion(c))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-2 border-marca-azul p-4">
        <p className="mb-2 text-sm font-black uppercase text-marca-azul">
          Encargos ({encargos.length})
        </p>
        {encargos.length === 0 ? (
          <p className="text-sm text-marca-azul/70">Sin encargos registrados.</p>
        ) : (
          <div className="space-y-2">
            {encargos.map((e) => (
              <div key={e.id} className="border-t border-marca-azul/10 pt-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-marca-azul">{e.descripcionProducto}</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-black uppercase ${
                      ESTILO_ESTADO_ENCARGO[e.estado] || ""
                    }`}
                  >
                    {e.estado}
                  </span>
                </div>
                <span className="text-marca-azul/70">{formatoCLP(e.precioTotal)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const { clientes, loading } = useClientes();
  const { encargos } = useEncargos();
  const { cotizaciones } = useCotizaciones();
  const [busqueda, setBusqueda] = useState("");
  const [clienteId, setClienteId] = useState(null);

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(texto) || c.telefono?.toLowerCase().includes(texto)
    );
  }, [clientes, busqueda]);

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId) || null;

  const encargosCliente = useMemo(
    () => (clienteId ? encargos.filter((e) => e.clienteId === clienteId) : []),
    [encargos, clienteId]
  );
  const cotizacionesCliente = useMemo(
    () => (clienteId ? cotizaciones.filter((c) => c.clienteId === clienteId) : []),
    [cotizaciones, clienteId]
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black uppercase text-marca-azul">Clientes</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="mb-3 w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
          {loading ? (
            <p className="font-bold text-marca-azul">Cargando...</p>
          ) : (
            <div className="space-y-1">
              {clientesFiltrados.length === 0 && (
                <p className="text-marca-azul/70">No se encontraron clientes.</p>
              )}
              {clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClienteId(c.id)}
                  className={`block w-full border-2 p-3 text-left ${
                    clienteId === c.id
                      ? "border-marca-rojo bg-marca-rojo/10"
                      : "border-marca-azul/30 hover:bg-marca-azul/5"
                  }`}
                >
                  <p className="font-bold text-marca-azul">{c.nombre || "Sin nombre"}</p>
                  <p className="text-sm text-marca-azul/70">{c.telefono || "—"}</p>
                  {c.saldoAFavor > 0 && (
                    <p className="text-sm font-bold text-marca-rojo">
                      Saldo a favor: {formatoCLP(c.saldoAFavor)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {clienteSeleccionado ? (
            <FichaCliente
              cliente={clienteSeleccionado}
              encargos={encargosCliente}
              cotizaciones={cotizacionesCliente}
            />
          ) : (
            <p className="text-marca-azul/70">Elegí un cliente de la lista para ver su ficha.</p>
          )}
        </div>
      </div>
    </div>
  );
}
