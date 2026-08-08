import { useMemo, useState } from "react";
import { formatoCLP } from "../../lib/format";

function stockTotal(proveedores) {
  return (proveedores || []).reduce((total, p) => total + (p.stock || 0), 0);
}

export default function BuscadorProducto({ productos, onSeleccionar }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    const busqueda = texto.trim().toLowerCase();
    if (!busqueda) return [];
    return productos
      .filter((p) => {
        return (
          p.nombre?.toLowerCase().includes(busqueda) ||
          p.marcaRepuesto?.toLowerCase().includes(busqueda) ||
          p.marcaVehiculo?.toLowerCase().includes(busqueda) ||
          p.modelo?.toLowerCase().includes(busqueda) ||
          p.proveedores?.some((prov) => prov.nombre?.toLowerCase().includes(busqueda))
        );
      })
      .slice(0, 8);
  }, [productos, texto]);

  function seleccionar(producto) {
    onSeleccionar(producto);
    setTexto("");
    setAbierto(false);
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-bold text-marca-azul">
        Buscar producto a vender
      </label>
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Nombre, marca, modelo o proveedor..."
        className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
      />
      {abierto && resultados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full border-2 border-marca-azul bg-white shadow-lg">
          {resultados.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => seleccionar(p)}
              className="flex w-full items-center justify-between border-b border-marca-azul/10 p-3 text-left last:border-b-0 hover:bg-marca-azul/10"
            >
              <div>
                <p className="font-bold text-marca-azul">{p.nombre}</p>
                <p className="text-sm text-marca-azul/70">
                  {p.marcaRepuesto}
                  {p.modelo ? ` · ${p.modelo}` : ""}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold">{formatoCLP(rangoVentaMin(p.proveedores))}</p>
                <p className="text-marca-azul/70">Stock: {stockTotal(p.proveedores)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {abierto && texto.trim() && resultados.length === 0 && (
        <div className="absolute z-10 mt-1 w-full border-2 border-marca-azul bg-white p-3 text-sm text-marca-azul/70 shadow-lg">
          No se encontraron productos con stock disponible.
        </div>
      )}
    </div>
  );
}

function rangoVentaMin(proveedores) {
  const valores = (proveedores || [])
    .filter((p) => (p.stock || 0) > 0)
    .map((p) => p.venta)
    .filter((v) => v !== null && v !== undefined);
  if (valores.length === 0) return null;
  return Math.min(...valores);
}
