import { useMemo, useState } from "react";
import { useEncargos } from "../../hooks/useEncargos";
import { marcarLlegado, marcarEntregado } from "../../lib/firestore/encargos";
import { METODOS_PAGO } from "../../lib/constants";
import { formatoCLP } from "../../lib/format";

const TABS = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "llego", label: "Llegó" },
  { value: "entregado", label: "Entregado" },
];

const ESTILO_ESTADO = {
  pendiente: "bg-red-600 text-white",
  llego: "bg-yellow-400 text-marca-azul",
  entregado: "bg-green-600 text-white",
};

function formatoFecha(fecha) {
  if (!fecha?.toDate) return "—";
  return fecha.toDate().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function EncargoCard({ encargo }) {
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);
  const [metodoPagoSaldo, setMetodoPagoSaldo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const saldoPendiente = Math.max(
    0,
    (encargo.precioTotal || 0) - (encargo.montoAbonado || 0)
  );

  async function handleMarcarLlegado() {
    setGuardando(true);
    try {
      await marcarLlegado(encargo.id);
    } finally {
      setGuardando(false);
    }
  }

  async function handleMarcarEntregado(pagoSaldo) {
    setGuardando(true);
    try {
      await marcarEntregado(encargo.id, {
        pagoSaldo,
        metodoPagoSaldo,
        precioTotal: encargo.precioTotal,
      });
      setConfirmandoEntrega(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="border-2 border-marca-azul/30 p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-marca-azul">{encargo.descripcionProducto}</p>
          <p className="text-sm text-marca-azul/70">
            {encargo.clienteNombre || "Sin datos de cliente"}
            {encargo.clienteTelefono ? ` — ${encargo.clienteTelefono}` : ""}
          </p>
          <p className="text-sm text-marca-azul/70">
            {encargo.proveedor}
            {[encargo.vehiculoMarca, encargo.vehiculoModelo, encargo.vehiculoAnio]
              .filter(Boolean).length > 0
              ? ` · ${[encargo.vehiculoMarca, encargo.vehiculoModelo, encargo.vehiculoAnio]
                  .filter(Boolean)
                  .join(" ")}`
              : ""}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-black uppercase ${
            ESTILO_ESTADO[encargo.estado] || ""
          }`}
        >
          {TABS.find((t) => t.value === encargo.estado)?.label || encargo.estado}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <p className="text-marca-azul/70">
          Llegada estimada: {formatoFecha(encargo.fechaEstimadaLlegada)}
        </p>
        <div className="text-right">
          <p className="font-bold text-marca-azul">{formatoCLP(encargo.precioTotal)}</p>
          <p className="text-marca-azul/70">
            {saldoPendiente > 0
              ? `Saldo pendiente: ${formatoCLP(saldoPendiente)}`
              : "Pagado"}
          </p>
        </div>
      </div>

      {encargo.estado === "pendiente" && (
        <button
          type="button"
          onClick={handleMarcarLlegado}
          disabled={guardando}
          className="mt-3 w-full border-2 border-marca-azul px-4 py-2 text-sm font-black uppercase text-marca-azul hover:bg-marca-azul/10 disabled:opacity-50"
        >
          Marcar ha llegado
        </button>
      )}

      {encargo.estado === "llego" && !confirmandoEntrega && (
        <button
          type="button"
          onClick={() => {
            if (saldoPendiente > 0) setConfirmandoEntrega(true);
            else handleMarcarEntregado(false);
          }}
          disabled={guardando}
          className="mt-3 w-full bg-marca-rojo px-4 py-2 text-sm font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
        >
          Marcar entregado
        </button>
      )}

      {encargo.estado === "llego" && confirmandoEntrega && (
        <div className="mt-3 border-2 border-marca-rojo/30 p-3">
          <p className="mb-2 text-sm font-bold text-marca-azul">
            Queda un saldo de {formatoCLP(saldoPendiente)}. ¿Cómo lo paga al retirar?
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {METODOS_PAGO.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetodoPagoSaldo(m.value)}
                className={`px-3 py-1.5 text-sm font-black uppercase ${
                  metodoPagoSaldo === m.value
                    ? "bg-marca-azul text-white"
                    : "bg-marca-azul/10 text-marca-azul"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmandoEntrega(false)}
              className="px-4 py-1.5 text-sm font-bold uppercase text-marca-azul"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!metodoPagoSaldo || guardando}
              onClick={() => handleMarcarEntregado(true)}
              className="flex-1 bg-marca-rojo px-4 py-1.5 text-sm font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
            >
              Confirmar pago y entrega
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EncargosPage() {
  const { encargos, loading } = useEncargos();
  const [tab, setTab] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const encargosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return encargos.filter((e) => {
      if (tab !== "todos" && e.estado !== tab) return false;
      if (texto) {
        const coincide =
          e.descripcionProducto?.toLowerCase().includes(texto) ||
          e.clienteNombre?.toLowerCase().includes(texto) ||
          e.proveedor?.toLowerCase().includes(texto);
        if (!coincide) return false;
      }
      return true;
    });
  }, [encargos, tab, busqueda]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black uppercase text-marca-azul">
        Cuaderno de Encargos
      </h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-bold uppercase ${
              tab === t.value ? "bg-marca-azul text-white" : "bg-marca-azul/10 text-marca-azul"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por producto, cliente o proveedor..."
        className="mb-4 w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
      />

      {loading ? (
        <p className="font-bold text-marca-azul">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {encargosFiltrados.length === 0 && (
            <p className="text-marca-azul/70">No hay encargos en este filtro.</p>
          )}
          {encargosFiltrados.map((e) => (
            <EncargoCard key={e.id} encargo={e} />
          ))}
        </div>
      )}
    </div>
  );
}
