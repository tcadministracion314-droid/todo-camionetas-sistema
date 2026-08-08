import { formatoCLP } from "../../lib/format";

function formatoFecha(fecha) {
  if (!fecha?.toDate) return "";
  return fecha.toDate().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CotizacionImprimibleModal({ cotizacion, onClose }) {
  const total = (cotizacion.items || []).reduce(
    (acc, it) => acc + (it.precioSugerido || 0) * it.cantidad,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-4 border-marca-rojo bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase text-marca-azul">Cotización</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold uppercase text-marca-azul"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-marca-rojo px-5 py-2 font-black uppercase text-white hover:opacity-90"
            >
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        <div className="imprimible">
          <div className="mb-6 flex items-start justify-between border-b-4 border-marca-rojo pb-4">
            <div>
              <p className="text-2xl font-black uppercase text-marca-azul">
                Todo Camionetas
              </p>
              <p className="text-sm text-marca-azul/70">Cotización de productos</p>
            </div>
            <p className="text-sm text-marca-azul/70">{formatoFecha(cotizacion.fecha)}</p>
          </div>

          {(cotizacion.clienteNombre || cotizacion.clienteTelefono) && (
            <div className="mb-4">
              <p className="text-sm font-black uppercase text-marca-azul">Cliente</p>
              {cotizacion.clienteNombre && <p>{cotizacion.clienteNombre}</p>}
              <p className="text-sm text-marca-azul/70">
                {[cotizacion.clienteTelefono, cotizacion.clienteCorreo]
                  .filter(Boolean)
                  .join(" — ")}
              </p>
            </div>
          )}

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-marca-azul">
                <th className="py-2">Producto</th>
                <th className="py-2">Vehículo</th>
                <th className="py-2">Cant.</th>
                <th className="py-2">Precio sugerido</th>
                <th className="py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(cotizacion.items || []).map((it, i) => (
                <tr key={i} className="border-b border-marca-azul/20">
                  <td className="py-2">
                    <p className="font-bold">{it.descripcionProducto}</p>
                    <p className="text-sm text-marca-azul/70">
                      {[it.marcaRepuesto, it.proveedor].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="py-2 text-sm">
                    {[it.vehiculoMarca, it.vehiculoModelo, it.vehiculoAnio]
                      .filter(Boolean)
                      .join(" ")}
                  </td>
                  <td className="py-2">{it.cantidad}</td>
                  <td className="py-2">
                    {it.precioSugerido ? formatoCLP(it.precioSugerido) : "A confirmar"}
                  </td>
                  <td className="py-2">
                    {it.precioSugerido
                      ? formatoCLP(it.precioSugerido * it.cantidad)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-right text-xl font-black text-marca-azul">
            Total sugerido: {formatoCLP(total)}
          </div>

          {cotizacion.notas && (
            <div className="mt-4">
              <p className="text-sm font-black uppercase text-marca-azul">Notas</p>
              <p className="text-sm">{cotizacion.notas}</p>
            </div>
          )}

          <p className="mt-8 text-xs text-marca-azul/50">
            Cotización sin validez de venta — precios sujetos a confirmación de stock al
            momento de la compra.
          </p>
        </div>
      </div>
    </div>
  );
}
