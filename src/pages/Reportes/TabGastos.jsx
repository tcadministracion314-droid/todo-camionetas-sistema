import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useGastos } from "../../hooks/useGastos";
import { useCatalogo } from "../../hooks/useCatalogo";
import { crearGasto } from "../../lib/firestore/gastos";
import { formatoCLP } from "../../lib/format";
import CampoConSugerencias from "../../components/CampoConSugerencias";

function formatoFecha(fecha) {
  if (!fecha?.toDate) return "—";
  return fecha.toDate().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaMesISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const FORM_VACIO = {
  fecha: hoyISO(),
  categoria: "",
  descripcion: "",
  valor: "",
};

function NuevoGastoForm({ registradoPor }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { valores: categorias } = useCatalogo("categoriasGasto");

  function campo(nombre, valor) {
    setForm((prev) => ({ ...prev, [nombre]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.categoria.trim()) return setError("Ingresa la categoría del gasto.");
    if (!form.valor || Number(form.valor) <= 0) return setError("Ingresa el valor del gasto.");

    setGuardando(true);
    try {
      await crearGasto({ ...form, registradoPor });
      setForm({ ...FORM_VACIO, fecha: hoyISO() });
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el gasto. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-2 border-marca-azul p-4">
      <div>
        <label className="mb-1 block text-sm font-bold text-marca-azul">Fecha</label>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => campo("fecha", e.target.value)}
          className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        />
      </div>

      <CampoConSugerencias
        id="gastoCategoria"
        label="Categoría (ej. Arriendo, Luz, Agua, Internet)"
        value={form.categoria}
        onChange={(v) => campo("categoria", v)}
        sugerencias={categorias}
        required
      />

      <div>
        <label className="mb-1 block text-sm font-bold text-marca-azul">
          Descripción (opcional)
        </label>
        <input
          value={form.descripcion}
          onChange={(e) => campo("descripcion", e.target.value)}
          className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-marca-azul">Valor</label>
        <input
          type="number"
          min="0"
          value={form.valor}
          onChange={(e) => campo("valor", e.target.value)}
          className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        />
      </div>

      {error && <p className="font-bold text-marca-rojo">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="w-full bg-marca-rojo px-6 py-2 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Registrar gasto"}
      </button>
    </form>
  );
}

export default function TabGastos() {
  const { user } = useAuth();
  const { gastos, loading } = useGastos();

  const [fechaDesde, setFechaDesde] = useState(primerDiaMesISO());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");

  const categorias = useMemo(() => {
    const set = new Set(gastos.map((g) => g.categoria).filter(Boolean));
    return [...set].sort();
  }, [gastos]);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const f = g.fecha?.toDate?.();
      if (!f) return false;
      if (fechaDesde && f < new Date(`${fechaDesde}T00:00:00`)) return false;
      if (fechaHasta && f > new Date(`${fechaHasta}T23:59:59.999`)) return false;
      if (categoriaFiltro !== "todas" && g.categoria !== categoriaFiltro) return false;
      return true;
    });
  }, [gastos, fechaDesde, fechaHasta, categoriaFiltro]);

  const totalFiltrado = gastosFiltrados.reduce((acc, g) => acc + (g.valor || 0), 0);

  const porCategoria = useMemo(() => {
    const acumulado = new Map();
    gastosFiltrados.forEach((g) => {
      acumulado.set(g.categoria, (acumulado.get(g.categoria) || 0) + (g.valor || 0));
    });
    return [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
  }, [gastosFiltrados]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Registrar gasto
        </h2>
        <NuevoGastoForm registradoPor={user} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Resumen de gastos
        </h2>

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
        </div>

        {loading ? (
          <p className="font-bold text-marca-azul">Cargando...</p>
        ) : (
          <>
            <div className="mb-4 border-2 border-marca-rojo p-4">
              <p className="text-sm font-black uppercase text-marca-rojo">Total gastado</p>
              <p className="text-2xl font-black text-marca-azul">
                {formatoCLP(totalFiltrado)}
              </p>
              <p className="text-sm text-marca-azul/70">{gastosFiltrados.length} gasto(s)</p>
            </div>

            {porCategoria.length > 0 && (
              <div className="mb-4 border-2 border-marca-azul/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-black uppercase text-marca-azul">
                    Por categoría
                  </p>
                  {categoriaFiltro !== "todas" && (
                    <button
                      type="button"
                      onClick={() => setCategoriaFiltro("todas")}
                      className="text-xs font-bold text-marca-rojo hover:underline"
                    >
                      Ver todas
                    </button>
                  )}
                </div>
                {porCategoria.map(([nombre, total]) => (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => setCategoriaFiltro(nombre)}
                    className={`flex w-full justify-between px-2 py-1 text-sm ${
                      categoriaFiltro === nombre
                        ? "bg-marca-rojo/10 font-bold text-marca-rojo"
                        : "text-marca-azul/70 hover:bg-marca-azul/5"
                    }`}
                  >
                    <span>{nombre}</span>
                    <span className="font-bold text-marca-azul">{formatoCLP(total)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {gastosFiltrados.length === 0 && (
                <p className="text-marca-azul/70">Sin gastos en este período.</p>
              )}
              {gastosFiltrados
                .slice()
                .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
                .map((g) => (
                  <div key={g.id} className="border-2 border-marca-azul/30 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-marca-azul">{g.categoria}</span>
                      <span className="font-black text-marca-azul">
                        {formatoCLP(g.valor)}
                      </span>
                    </div>
                    <p className="text-marca-azul/70">
                      {formatoFecha(g.fecha)}
                      {g.descripcion ? ` — ${g.descripcion}` : ""}
                    </p>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
