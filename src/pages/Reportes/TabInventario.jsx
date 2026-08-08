import { useMemo } from "react";
import { CATEGORIAS } from "../../lib/constants";
import { formatoCLP } from "../../lib/format";

export default function TabInventario({ productos }) {
  const valorizado = useMemo(() => {
    const porCategoria = Object.fromEntries(
      CATEGORIAS.map((c) => [c.value, { costoTotal: 0, ventaTotal: 0, unidades: 0, productos: 0 }])
    );

    productos.forEach((p) => {
      const acumulado = porCategoria[p.categoria];
      if (!acumulado) return;
      let tieneStock = false;
      (p.proveedores || []).forEach((prov) => {
        const stock = prov.stock || 0;
        if (stock > 0) tieneStock = true;
        acumulado.costoTotal += (prov.costo || 0) * stock;
        acumulado.ventaTotal += (prov.venta || 0) * stock;
        acumulado.unidades += stock;
      });
      if (tieneStock) acumulado.productos += 1;
    });

    return porCategoria;
  }, [productos]);

  const porComprar = useMemo(
    () => productos.filter((p) => p.tipoInventario === "proyectado"),
    [productos]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Inventario valorizado por categoría
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CATEGORIAS.map((c) => {
            const v = valorizado[c.value];
            return (
              <div key={c.value} className="border-2 border-marca-azul p-4">
                <p className="text-sm font-black uppercase text-marca-azul/70">{c.label}</p>
                <p className="text-sm text-marca-azul/70">
                  {v.productos} producto(s) con stock — {v.unidades} unidades
                </p>
                <p className="mt-1">
                  Costo: <span className="font-black text-marca-azul">{formatoCLP(v.costoTotal)}</span>
                </p>
                <p>
                  Valor de venta:{" "}
                  <span className="font-black text-marca-azul">{formatoCLP(v.ventaTotal)}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
          Por comprar ({porComprar.length})
        </h2>
        <div className="overflow-x-auto border-2 border-marca-azul">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-marca-azul text-white">
                <th className="p-2">Nombre</th>
                <th className="p-2">Marca repuesto</th>
                <th className="p-2">Modelo</th>
                <th className="p-2">Proveedor sugerido</th>
                <th className="p-2">Costo</th>
              </tr>
            </thead>
            <tbody>
              {porComprar.map((p) => (
                <tr key={p.id} className="border-t border-marca-azul/20">
                  <td className="p-2 font-bold">{p.nombre}</td>
                  <td className="p-2">{p.marcaRepuesto}</td>
                  <td className="p-2">{p.modelo || "—"}</td>
                  <td className="p-2">{p.proveedores?.[0]?.nombre || "—"}</td>
                  <td className="p-2">{formatoCLP(p.proveedores?.[0]?.costo)}</td>
                </tr>
              ))}
              {porComprar.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-marca-azul/70">
                    No hay productos proyectados pendientes de comprar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
