import { useMemo, useState } from "react";
import { useFacturasProveedor } from "../../hooks/useFacturasProveedor";
import { useCompras } from "../../hooks/useCompras";
import { useProveedores } from "../../hooks/useProveedores";
import { marcarFacturaPagada } from "../../lib/firestore/facturasProveedor";
import { formatoCLP } from "../../lib/format";
import ConfiguracionCreditoProveedores from "./ConfiguracionCreditoProveedores";

function formatoFecha(fecha) {
  if (!fecha?.toDate) return "—";
  return fecha.toDate().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calcularVencimiento(fecha, diasCredito) {
  if (!fecha?.toDate) return null;
  const vencimiento = fecha.toDate();
  vencimiento.setDate(vencimiento.getDate() + (diasCredito || 0));
  return vencimiento;
}

export default function FacturasProveedorSection() {
  const { facturas, loading } = useFacturasProveedor();
  const { compras } = useCompras();
  const { proveedores: proveedoresConCredito } = useProveedores();
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");
  const [expandida, setExpandida] = useState(null);
  const [marcando, setMarcando] = useState(null);

  const diasCreditoPorProveedor = useMemo(() => {
    const mapa = new Map();
    proveedoresConCredito.forEach((p) => mapa.set(p.nombre, p.diasCredito || 0));
    return mapa;
  }, [proveedoresConCredito]);

  const facturasConEstado = useMemo(() => {
    const hoy = new Date();
    return facturas.map((f) => {
      const diasCredito = diasCreditoPorProveedor.get(f.proveedor) || 0;
      const vencimiento = calcularVencimiento(f.fecha, diasCredito);
      const atrasada = !f.fechaPago && vencimiento && hoy > vencimiento;
      return { ...f, vencimiento, atrasada };
    });
  }, [facturas, diasCreditoPorProveedor]);

  const proveedores = useMemo(() => {
    const set = new Set(facturas.map((f) => f.proveedor).filter(Boolean));
    return [...set].sort();
  }, [facturas]);

  const facturasFiltradas = useMemo(() => {
    if (proveedorFiltro === "todos") return facturasConEstado;
    return facturasConEstado.filter((f) => f.proveedor === proveedorFiltro);
  }, [facturasConEstado, proveedorFiltro]);

  const atrasadas = useMemo(() => facturasConEstado.filter((f) => f.atrasada), [facturasConEstado]);

  const totalPorProveedor = useMemo(() => {
    const acumulado = new Map();
    facturas.forEach((f) => {
      acumulado.set(f.proveedor, (acumulado.get(f.proveedor) || 0) + (f.valor || 0));
    });
    return [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
  }, [facturas]);

  const totalFiltrado = facturasFiltradas.reduce((acc, f) => acc + (f.valor || 0), 0);

  function productosDeFactura(facturaId) {
    return compras.filter((c) => c.facturaId === facturaId);
  }

  async function handleMarcarPagada(id) {
    setMarcando(id);
    try {
      await marcarFacturaPagada(id);
    } finally {
      setMarcando(null);
    }
  }

  return (
    <div className="mt-6 border-t-4 border-marca-rojo pt-4">
      <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
        Facturas de proveedor (registro de plata gastada)
      </h2>

      <ConfiguracionCreditoProveedores />

      {atrasadas.length > 0 && (
        <div className="mb-3 border-2 border-marca-rojo bg-marca-rojo/10 p-3">
          <p className="text-sm font-black uppercase text-marca-rojo">
            ⚠ {atrasadas.length} factura(s) atrasada(s) —{" "}
            {formatoCLP(atrasadas.reduce((acc, f) => acc + (f.valor || 0), 0))}
          </p>
        </div>
      )}

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
            <p className="text-sm font-black uppercase text-marca-azul">Por proveedor</p>
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
          {facturasFiltradas.length === 0 && (
            <p className="text-marca-azul/70">Sin facturas en este filtro.</p>
          )}
          {facturasFiltradas
            .slice()
            .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
            .map((f) => {
              const productos = productosDeFactura(f.id);
              const abierta = expandida === f.id;
              return (
                <div
                  key={f.id}
                  className={`border-2 ${
                    f.atrasada ? "border-marca-rojo" : "border-marca-azul/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandida(abierta ? null : f.id)}
                    className="flex w-full items-center justify-between p-2 text-left text-sm hover:bg-marca-azul/5"
                  >
                    <span className="text-marca-azul/70">
                      {abierta ? "▼" : "▶"} {formatoFecha(f.fecha)} — {f.proveedor}
                      {f.numeroFactura ? ` — N° ${f.numeroFactura}` : ""}
                      {productos.length > 0 ? ` — ${productos.length} producto(s)` : ""}
                      {f.atrasada && (
                        <span className="ml-2 font-black uppercase text-marca-rojo">
                          Atrasada
                        </span>
                      )}
                      {f.fechaPago && (
                        <span className="ml-2 font-bold text-green-700">
                          Pagada {formatoFecha(f.fechaPago)}
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-marca-azul">{formatoCLP(f.valor)}</span>
                  </button>
                  {abierta && (
                    <div className="border-t border-marca-azul/10 bg-marca-azul/5 p-2">
                      {productos.length === 0 ? (
                        <p className="text-sm text-marca-azul/70">
                          Sin productos ligados a esta factura.
                        </p>
                      ) : (
                        <div className="mb-2 space-y-1">
                          {productos.map((c) => (
                            <div key={c.id} className="flex justify-between text-sm">
                              <span className="text-marca-azul/70">
                                {c.productoNombre} — {c.cantidad} un. × {formatoCLP(c.costoUnitario)}
                              </span>
                              <span className="font-bold text-marca-azul">
                                {formatoCLP(c.total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!f.fechaPago && (
                        <button
                          type="button"
                          onClick={() => handleMarcarPagada(f.id)}
                          disabled={marcando === f.id}
                          className="text-sm font-bold text-marca-azul hover:underline disabled:opacity-50"
                        >
                          {marcando === f.id ? "Guardando..." : "Marcar pagada"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
