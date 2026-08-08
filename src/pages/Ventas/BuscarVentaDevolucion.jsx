import { useState } from "react";
import { buscarVentasParaDevolucion } from "../../lib/firestore/ventas";
import { formatoCLP } from "../../lib/format";
import DevolucionModal from "./DevolucionModal";
import CambioModal from "./CambioModal";

function formatoFecha(fecha) {
  if (!fecha?.toDate) return "";
  return fecha.toDate().toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BuscarVentaDevolucion({ productos, vendedor }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [seleccionDevolucion, setSeleccionDevolucion] = useState(null);
  const [seleccionCambio, setSeleccionCambio] = useState(null);

  async function buscar(e) {
    e.preventDefault();
    setBuscando(true);
    try {
      const items = await buscarVentasParaDevolucion(texto);
      setResultados(items);
      setBuscado(true);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="border-2 border-marca-azul p-4">
      <form onSubmit={buscar} className="mb-4 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre o marca del producto vendido..."
          className="flex-1 border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        />
        <button
          type="submit"
          disabled={buscando}
          className="bg-marca-azul px-5 py-2 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
        >
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      <div className="space-y-2">
        {buscado && resultados.length === 0 && (
          <p className="text-marca-azul/70">No se encontraron ventas.</p>
        )}
        {resultados.map(({ venta, itemIndex, item }) => (
          <div
            key={`${venta.id}-${itemIndex}`}
            className="flex items-center justify-between border-2 border-marca-azul/30 p-3"
          >
            <div>
              <p className="font-bold text-marca-azul">
                {item.productoNombre} × {item.cantidad}
              </p>
              <p className="text-sm text-marca-azul/70">
                {formatoFecha(venta.fecha)} — {venta.vendedorEmail}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-black text-marca-azul">{formatoCLP(item.subtotal)}</p>
              <button
                type="button"
                onClick={() => setSeleccionDevolucion({ venta, itemIndex })}
                className="text-sm font-bold text-marca-rojo hover:underline"
              >
                Devolver
              </button>
              <button
                type="button"
                onClick={() => setSeleccionCambio({ venta, itemIndex })}
                className="text-sm font-bold text-marca-azul hover:underline"
              >
                Cambiar
              </button>
            </div>
          </div>
        ))}
      </div>

      {seleccionDevolucion && (
        <DevolucionModal
          venta={seleccionDevolucion.venta}
          itemIndex={seleccionDevolucion.itemIndex}
          vendedor={vendedor}
          onClose={() => setSeleccionDevolucion(null)}
        />
      )}
      {seleccionCambio && (
        <CambioModal
          venta={seleccionCambio.venta}
          itemIndex={seleccionCambio.itemIndex}
          productos={productos}
          vendedor={vendedor}
          onClose={() => setSeleccionCambio(null)}
        />
      )}
    </div>
  );
}
