import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useCompras } from "../../hooks/useCompras";
import { useProductos } from "../../hooks/useProductos";
import { formatoCLP } from "../../lib/format";
import NuevaCompraForm from "./NuevaCompraForm";

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

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function primerDiaMesISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function TabCompras() {
  const { user } = useAuth();
  const { compras, loading } = useCompras();
  const { productos } = useProductos();

  const [fechaDesde, setFechaDesde] = useState(primerDiaMesISO());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [proveedor, setProveedor] = useState("todos");

  const proveedores = useMemo(() => {
    const set = new Set(compras.map((c) => c.proveedorNombre).filter(Boolean));
    return [...set].sort();
  }, [compras]);

  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      const f = c.fecha?.toDate?.();
      if (!f) return false;
      if (fechaDesde && f < new Date(`${fechaDesde}T00:00:00`)) return false;
      if (fechaHasta && f > new Date(`${fechaHasta}T23:59:59.999`)) return false;
      if (proveedor !== "todos" && c.proveedorNombre !== proveedor) return false;
      return true;
    });
  }, [compras, fechaDesde, fechaHasta, proveedor]);

  const totalGastado = comprasFiltradas.reduce((acc, c) => acc + (c.total || 0), 0);

  const porProveedor = useMemo(() => {
    const acumulado = new Map();
    comprasFiltradas.forEach((c) => {
      const actual = acumulado.get(c.proveedorNombre) || 0;
      acumulado.set(c.proveedorNombre, actual + (c.total || 0));
    });
    return [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
  }, [comprasFiltradas]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Registrar compra
        </h2>
        <NuevaCompraForm productos={productos} comprador={user} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Resumen de compras
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
          <div>
            <label className="mb-1 block text-xs font-bold text-marca-azul">Proveedor</label>
            <select
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
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
        </div>

        {loading ? (
          <p className="font-bold text-marca-azul">Cargando...</p>
        ) : (
          <>
            <div className="mb-4 border-2 border-marca-rojo p-4">
              <p className="text-sm font-black uppercase text-marca-rojo">Total gastado</p>
              <p className="text-2xl font-black text-marca-azul">
                {formatoCLP(totalGastado)}
              </p>
              <p className="text-sm text-marca-azul/70">
                {comprasFiltradas.length} compra(s)
              </p>
            </div>

            {porProveedor.length > 0 && (
              <div className="mb-4 border-2 border-marca-azul/30 p-3">
                <p className="mb-2 text-sm font-black uppercase text-marca-azul">
                  Por proveedor
                </p>
                {porProveedor.map(([nombre, total]) => (
                  <div key={nombre} className="flex justify-between text-sm">
                    <span className="text-marca-azul/70">{nombre}</span>
                    <span className="font-bold text-marca-azul">{formatoCLP(total)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {comprasFiltradas.length === 0 && (
                <p className="text-marca-azul/70">Sin compras en este período.</p>
              )}
              {comprasFiltradas
                .slice()
                .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
                .map((c) => (
                  <div key={c.id} className="border-2 border-marca-azul/30 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-marca-azul">{c.productoNombre}</span>
                      <span className="font-black text-marca-azul">
                        {formatoCLP(c.total)}
                      </span>
                    </div>
                    <p className="text-marca-azul/70">
                      {formatoFechaHora(c.fecha)} — {c.proveedorNombre} — {c.cantidad} un.
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
