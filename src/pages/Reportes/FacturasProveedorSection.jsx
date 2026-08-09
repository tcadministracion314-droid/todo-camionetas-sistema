import { useMemo, useState } from "react";
import CampoConSugerencias from "../../components/CampoConSugerencias";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useFacturasProveedor } from "../../hooks/useFacturasProveedor";
import { crearFacturaProveedor } from "../../lib/firestore/facturasProveedor";
import { formatoCLP } from "../../lib/format";

const FORM_VACIO = {
  fecha: new Date().toISOString().slice(0, 10),
  fechaPago: "",
  proveedor: "",
  numeroFactura: "",
  valor: "",
};

function formatoFecha(fecha) {
  if (!fecha?.toDate) return "—";
  return fecha.toDate().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FacturasProveedorSection() {
  const { facturas, loading } = useFacturasProveedor();
  const { valores: proveedoresSugeridos } = useCatalogo("proveedores");
  const [form, setForm] = useState(FORM_VACIO);
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function campo(nombre, valor) {
    setForm((prev) => ({ ...prev, [nombre]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.proveedor.trim()) return setError("Ingresa el proveedor.");
    if (!form.valor || Number(form.valor) <= 0) return setError("Ingresa el valor de la factura.");

    setGuardando(true);
    try {
      await crearFacturaProveedor(form);
      setForm({ ...FORM_VACIO, fecha: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la factura. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const proveedores = useMemo(() => {
    const set = new Set(facturas.map((f) => f.proveedor).filter(Boolean));
    return [...set].sort();
  }, [facturas]);

  const facturasFiltradas = useMemo(() => {
    if (proveedorFiltro === "todos") return facturas;
    return facturas.filter((f) => f.proveedor === proveedorFiltro);
  }, [facturas, proveedorFiltro]);

  const totalPorProveedor = useMemo(() => {
    const acumulado = new Map();
    facturas.forEach((f) => {
      acumulado.set(f.proveedor, (acumulado.get(f.proveedor) || 0) + (f.valor || 0));
    });
    return [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
  }, [facturas]);

  const totalFiltrado = facturasFiltradas.reduce((acc, f) => acc + (f.valor || 0), 0);

  return (
    <div className="mt-6 border-t-4 border-marca-rojo pt-4">
      <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
        Facturas de proveedor (registro de plata gastada)
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-3 border-2 border-marca-azul p-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Fecha factura
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => campo("fecha", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Fecha de pago (opcional)
              </label>
              <input
                type="date"
                value={form.fechaPago}
                onChange={(e) => campo("fechaPago", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <CampoConSugerencias
            id="facturaProveedor"
            label="Proveedor"
            value={form.proveedor}
            onChange={(v) => campo("proveedor", v)}
            sugerencias={proveedoresSugeridos}
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                N° Factura
              </label>
              <input
                value={form.numeroFactura}
                onChange={(e) => campo("numeroFactura", e.target.value)}
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
          </div>

          {error && <p className="font-bold text-marca-rojo">{error}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-marca-rojo px-6 py-2 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Registrar factura"}
          </button>
        </form>

        <div>
          <div className="mb-2">
            <label className="mb-1 block text-xs font-bold text-marca-azul">Proveedor</label>
            <select
              value={proveedorFiltro}
              onChange={(e) => setProveedorFiltro(e.target.value)}
              className="border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            >
              <option value="todos">Todos</option>
              {proveedores.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3 border-2 border-marca-rojo p-3">
            <p className="text-sm font-black uppercase text-marca-rojo">
              Total {proveedorFiltro === "todos" ? "general" : proveedorFiltro}
            </p>
            <p className="text-2xl font-black text-marca-azul">{formatoCLP(totalFiltrado)}</p>
            <p className="text-sm text-marca-azul/70">{facturasFiltradas.length} factura(s)</p>
          </div>

          {totalPorProveedor.length > 0 && (
            <div className="mb-3 border-2 border-marca-azul/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black uppercase text-marca-azul">
                  Por proveedor
                </p>
                {proveedorFiltro !== "todos" && (
                  <button
                    type="button"
                    onClick={() => setProveedorFiltro("todos")}
                    className="text-xs font-bold text-marca-rojo hover:underline"
                  >
                    Ver todos
                  </button>
                )}
              </div>
              {totalPorProveedor.map(([nombre, total]) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => setProveedorFiltro(nombre)}
                  className={`flex w-full justify-between px-2 py-1 text-sm ${
                    proveedorFiltro === nombre
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

          {loading ? (
            <p className="font-bold text-marca-azul">Cargando...</p>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {facturasFiltradas
                .slice()
                .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between border-2 border-marca-azul/20 p-2 text-sm"
                  >
                    <span className="text-marca-azul/70">
                      {formatoFecha(f.fecha)} — {f.proveedor}
                      {f.numeroFactura ? ` — N° ${f.numeroFactura}` : ""}
                    </span>
                    <span className="font-bold text-marca-azul">{formatoCLP(f.valor)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
