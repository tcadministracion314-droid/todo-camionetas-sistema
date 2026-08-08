import { useState } from "react";
import { METODOS_PAGO } from "../../lib/constants";
import { formatoCLP } from "../../lib/format";
import { buscarOCrearCliente } from "../../lib/firestore/clientes";
import { registrarDevolucion } from "../../lib/firestore/devoluciones";

export default function DevolucionModal({ venta, vendedor, onClose }) {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [motivo, setMotivo] = useState("reembolso");
  const [metodoPagoDevolucion, setMetodoPagoDevolucion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!clienteNombre.trim()) return setError("Ingresa el nombre del cliente.");
    if (!clienteTelefono.trim()) return setError("Ingresa el teléfono del cliente.");
    if (motivo === "reembolso" && !metodoPagoDevolucion) {
      return setError("Elige con qué método se devuelve el dinero.");
    }

    setGuardando(true);
    try {
      const clienteId = await buscarOCrearCliente({
        nombre: clienteNombre,
        telefono: clienteTelefono,
      });

      await registrarDevolucion({
        venta,
        motivo,
        metodoPagoDevolucion,
        clienteId,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        vendedor,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo registrar la devolución. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-4 border-marca-rojo bg-white p-6">
        <h2 className="mb-4 text-xl font-black uppercase text-marca-azul">
          Devolución
        </h2>

        <div className="mb-4 border-2 border-marca-azul/30 bg-marca-azul/5 p-3">
          <p className="font-bold text-marca-azul">
            {venta.productoNombre} × {venta.cantidad}
          </p>
          <p className="text-sm text-marca-azul/70">Monto a devolver: {formatoCLP(venta.total)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Nombre del cliente
              </label>
              <input
                required
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Teléfono
              </label>
              <input
                required
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Motivo
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMotivo("reembolso")}
                className={`flex-1 px-4 py-2 text-sm font-black uppercase ${
                  motivo === "reembolso"
                    ? "bg-marca-rojo text-white"
                    : "bg-marca-azul/10 text-marca-azul"
                }`}
              >
                Reembolso
              </button>
              <button
                type="button"
                onClick={() => setMotivo("saldoAFavor")}
                className={`flex-1 px-4 py-2 text-sm font-black uppercase ${
                  motivo === "saldoAFavor"
                    ? "bg-marca-rojo text-white"
                    : "bg-marca-azul/10 text-marca-azul"
                }`}
              >
                Saldo a favor
              </button>
            </div>
          </div>

          {motivo === "reembolso" ? (
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Método de pago del reembolso
              </label>
              <div className="flex flex-wrap gap-2">
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMetodoPagoDevolucion(m.value)}
                    className={`px-4 py-2 text-sm font-black uppercase ${
                      metodoPagoDevolucion === m.value
                        ? "bg-marca-azul text-white"
                        : "bg-marca-azul/10 text-marca-azul"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-marca-azul/70">
              Se le va a acreditar {formatoCLP(venta.total)} en su ficha de cliente,
              para usarlo en una compra futura.
            </p>
          )}

          {error && <p className="font-bold text-marca-rojo">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold uppercase text-marca-azul"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="bg-marca-rojo px-6 py-2 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Confirmar devolución"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
