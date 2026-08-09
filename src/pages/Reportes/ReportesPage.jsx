import { useMemo, useState } from "react";
import { useTodasLasVentas } from "../../hooks/useTodasLasVentas";
import { useProductos } from "../../hooks/useProductos";
import TabCaja from "./TabCaja";
import TabVentas from "./TabVentas";
import TabInventario from "./TabInventario";
import TabCompras from "./TabCompras";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaSemanaISO() {
  const d = new Date();
  const diaSemana = d.getDay();
  const desplazamiento = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setDate(d.getDate() - desplazamiento);
  return d.toISOString().slice(0, 10);
}

function primerDiaMesISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const TABS = [
  { value: "caja", label: "Caja" },
  { value: "ventas", label: "Ventas" },
  { value: "compras", label: "Compras" },
  { value: "inventario", label: "Inventario" },
];

export default function ReportesPage() {
  const { ventas, loading: cargandoVentas } = useTodasLasVentas();
  const { productos, loading: cargandoProductos } = useProductos();

  const [tab, setTab] = useState("caja");
  const [fechaDesde, setFechaDesde] = useState(hoyISO());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [vendedor, setVendedor] = useState("todos");

  const vendedores = useMemo(() => {
    const set = new Set(ventas.map((v) => v.vendedorEmail).filter(Boolean));
    return [...set].sort();
  }, [ventas]);

  function aplicarPreset(preset) {
    const hoy = hoyISO();
    if (preset === "hoy") {
      setFechaDesde(hoy);
      setFechaHasta(hoy);
    } else if (preset === "semana") {
      setFechaDesde(primerDiaSemanaISO());
      setFechaHasta(hoy);
    } else if (preset === "mes") {
      setFechaDesde(primerDiaMesISO());
      setFechaHasta(hoy);
    } else if (preset === "todo") {
      setFechaDesde("");
      setFechaHasta("");
    }
  }

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      const f = v.fecha?.toDate?.();
      if (!f) return false;
      if (fechaDesde) {
        const desde = new Date(`${fechaDesde}T00:00:00`);
        if (f < desde) return false;
      }
      if (fechaHasta) {
        const hasta = new Date(`${fechaHasta}T23:59:59.999`);
        if (f > hasta) return false;
      }
      if (vendedor !== "todos" && v.vendedorEmail !== vendedor) return false;
      return true;
    });
  }, [ventas, fechaDesde, fechaHasta, vendedor]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black uppercase text-marca-azul">Reportes</h1>

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

      {tab !== "inventario" && tab !== "compras" && (
        <div className="mb-4 flex flex-wrap items-end gap-3 border-2 border-marca-azul/30 p-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-marca-azul">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-marca-azul">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-marca-azul">Vendedor</label>
            <select
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className="border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            >
              <option value="todos">Todos</option>
              {vendedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => aplicarPreset("hoy")}
              className="px-3 py-2 text-sm font-bold uppercase text-marca-azul hover:underline"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => aplicarPreset("semana")}
              className="px-3 py-2 text-sm font-bold uppercase text-marca-azul hover:underline"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={() => aplicarPreset("mes")}
              className="px-3 py-2 text-sm font-bold uppercase text-marca-azul hover:underline"
            >
              Este mes
            </button>
            <button
              type="button"
              onClick={() => aplicarPreset("todo")}
              className="px-3 py-2 text-sm font-bold uppercase text-marca-azul hover:underline"
            >
              Todo
            </button>
          </div>
        </div>
      )}

      {tab === "caja" &&
        (cargandoVentas ? (
          <p className="font-bold text-marca-azul">Cargando...</p>
        ) : (
          <TabCaja ventas={ventasFiltradas} />
        ))}

      {tab === "ventas" &&
        (cargandoVentas ? (
          <p className="font-bold text-marca-azul">Cargando...</p>
        ) : (
          <TabVentas ventas={ventasFiltradas} />
        ))}

      {tab === "compras" && <TabCompras />}

      {tab === "inventario" &&
        (cargandoProductos ? (
          <p className="font-bold text-marca-azul">Cargando...</p>
        ) : (
          <TabInventario productos={productos} />
        ))}
    </div>
  );
}
