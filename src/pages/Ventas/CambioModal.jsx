import { useState } from "react";
import BuscadorProducto from "../../components/BuscadorProducto";
import { METODOS_PAGO } from "../../lib/constants";
import { formatoCLP } from "../../lib/format";
import { buscarOCrearCliente } from "../../lib/firestore/clientes";
import { registrarCambio } from "../../lib/firestore/cambios";

export default function CambioModal({ venta, itemIndex, productos, vendedor, onClose }) {
  const item = venta.items[itemIndex];
  const proporcion = venta.subtotal > 0 ? item.subtotal / venta.subtotal : 0;
  const precioDevueltoEstimado = Math.max(
    0,
    item.subtotal - Math.round((venta.descuentoMonto || 0) * proporcion)
  );

  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [productoNuevo, setProductoNuevo] = useState(null);
  const [proveedorNuevoNombre, setProveedorNuevoNombre] = useState("");
  const [cantidadNueva, setCantidadNueva] = useState("1");
  const [precioUnitarioNuevo, setPrecioUnitarioNuevo] = useState("");
  const [resolucionDiferencia, setResolucionDiferencia] = useState("");
  const [metodoPagoDiferencia, setMetodoPagoDiferencia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const proveedoresConStock = (productoNuevo?.proveedores || []).filter(
    (p) => (p.stock || 0) > 0
  );
  const proveedorElegido = proveedoresConStock.find(
    (p) => p.nombre === proveedorNuevoNombre
  );

  function seleccionarProductoNuevo(producto) {
    const disponibles = (producto.proveedores || []).filter((p) => (p.stock || 0) > 0);
    const unico = disponibles.length === 1 ? disponibles[0] : null;
    setProductoNuevo(producto);
    setProveedorNuevoNombre(unico?.nombre || "");
    setPrecioUnitarioNuevo(unico?.venta ?? "");
    setCantidadNueva("1");
    setResolucionDiferencia("");
  }

  function elegirProveedor(nombre) {
    const prov = proveedoresConStock.find((p) => p.nombre === nombre);
    setProveedorNuevoNombre(nombre);
    setPrecioUnitarioNuevo(prov?.venta ?? "");
    setCantidadNueva("1");
  }

  const cantidadNum = Number(cantidadNueva) || 0;
  const precioNum = Number(precioUnitarioNuevo) || 0;
  const precioNuevoTotal = cantidadNum * precioNum;
  const diferencia = precioNuevoTotal - precioDevueltoEstimado;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!clienteNombre.trim()) return setError("Ingresa el nombre del cliente.");
    if (!clienteTelefono.trim()) return setError("Ingresa el teléfono del cliente.");
    if (!productoNuevo) return setError("Busca y selecciona el producto nuevo.");
    if (!proveedorNuevoNombre) return setError("Elige de qué proveedor sale el producto nuevo.");
    if (cantidadNum <= 0) return setError("La cantidad debe ser mayor a 0.");
    if (proveedorElegido && cantidadNum > (proveedorElegido.stock || 0)) {
      return setError(`No hay stock suficiente (quedan ${proveedorElegido.stock}).`);
    }
    if (precioNum <= 0) return setError("Ingresa un precio de venta válido.");

    let resolucion = resolucionDiferencia;
    if (diferencia > 0) resolucion = "pagaCliente";
    else if (diferencia === 0) resolucion = "sinDiferencia";

    if (diferencia !== 0 && !resolucion) {
      return setError("Elige qué pasa con la diferencia.");
    }
    if ((resolucion === "pagaCliente" || resolucion === "vueltoInmediato") && !metodoPagoDiferencia) {
      return setError("Elige el método de pago de la diferencia.");
    }

    setGuardando(true);
    try {
      const clienteId = await buscarOCrearCliente({
        nombre: clienteNombre,
        telefono: clienteTelefono,
      });

      await registrarCambio({
        venta,
        itemIndex,
        productoNuevo,
        proveedorNuevoNombre,
        cantidadNueva: cantidadNum,
        precioUnitarioNuevo: precioNum,
        resolucionDiferencia: resolucion,
        metodoPagoDiferencia,
        clienteId,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        vendedor,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo registrar el cambio. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-4 border-marca-rojo bg-white p-6">
        <h2 className="mb-4 text-xl font-black uppercase text-marca-azul">
          Cambio de producto
        </h2>

        <div className="mb-4 border-2 border-marca-azul/30 bg-marca-azul/5 p-3">
          <p className="font-bold text-marca-azul">Se devuelve:</p>
          <p>
            {item.productoNombre} × {item.cantidad} — {formatoCLP(precioDevueltoEstimado)}
          </p>
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
            <p className="mb-2 text-sm font-black uppercase text-marca-rojo">
              Producto nuevo (por el que se cambia)
            </p>
            <BuscadorProducto productos={productos} onSeleccionar={seleccionarProductoNuevo} />
          </div>

          {productoNuevo && (
            <div className="border-2 border-marca-azul/30 bg-marca-azul/5 p-3">
              <p className="font-bold text-marca-azul">{productoNuevo.nombre}</p>
              <p className="text-sm text-marca-azul/70">{productoNuevo.marcaRepuesto}</p>
            </div>
          )}

          {productoNuevo && proveedoresConStock.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                ¿De qué proveedor sale el producto nuevo?
              </label>
              <select
                value={proveedorNuevoNombre}
                onChange={(e) => elegirProveedor(e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              >
                <option value="">Elige un proveedor...</option>
                {proveedoresConStock.map((p) => (
                  <option key={p.nombre} value={p.nombre}>
                    {p.nombre} — stock {p.stock} — {formatoCLP(p.venta)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {productoNuevo && proveedorNuevoNombre && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-marca-azul">
                    Cantidad (stock disponible: {proveedorElegido?.stock ?? 0})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={proveedorElegido?.stock ?? undefined}
                    value={cantidadNueva}
                    onChange={(e) => setCantidadNueva(e.target.value)}
                    className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-marca-azul">
                    Precio de venta (unitario)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={precioUnitarioNuevo}
                    onChange={(e) => setPrecioUnitarioNuevo(e.target.value)}
                    className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                  />
                </div>
              </div>

              <div className="border-t-2 border-marca-azul/20 pt-3">
                <p className="text-right text-sm text-marca-azul/70">
                  Producto nuevo: {formatoCLP(precioNuevoTotal)} — Producto devuelto:{" "}
                  {formatoCLP(precioDevueltoEstimado)}
                </p>
                <p className="text-right text-xl font-black text-marca-azul">
                  {diferencia === 0
                    ? "Sin diferencia"
                    : diferencia > 0
                    ? `El cliente paga: ${formatoCLP(diferencia)}`
                    : `A favor del cliente: ${formatoCLP(Math.abs(diferencia))}`}
                </p>
              </div>

              {diferencia > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-marca-azul">
                    Método de pago de la diferencia
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {METODOS_PAGO.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMetodoPagoDiferencia(m.value)}
                        className={`px-4 py-2 text-sm font-black uppercase ${
                          metodoPagoDiferencia === m.value
                            ? "bg-marca-azul text-white"
                            : "bg-marca-azul/10 text-marca-azul"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {diferencia < 0 && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-marca-azul">
                    ¿Qué se hace con la diferencia a favor del cliente?
                  </label>
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResolucionDiferencia("vueltoInmediato")}
                      className={`flex-1 px-4 py-2 text-sm font-black uppercase ${
                        resolucionDiferencia === "vueltoInmediato"
                          ? "bg-marca-rojo text-white"
                          : "bg-marca-azul/10 text-marca-azul"
                      }`}
                    >
                      Vuelto ahora
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolucionDiferencia("saldoAFavor")}
                      className={`flex-1 px-4 py-2 text-sm font-black uppercase ${
                        resolucionDiferencia === "saldoAFavor"
                          ? "bg-marca-rojo text-white"
                          : "bg-marca-azul/10 text-marca-azul"
                      }`}
                    >
                      Saldo a favor
                    </button>
                  </div>
                  {resolucionDiferencia === "vueltoInmediato" && (
                    <div className="flex flex-wrap gap-2">
                      {METODOS_PAGO.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMetodoPagoDiferencia(m.value)}
                          className={`px-4 py-2 text-sm font-black uppercase ${
                            metodoPagoDiferencia === m.value
                              ? "bg-marca-azul text-white"
                              : "bg-marca-azul/10 text-marca-azul"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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
              {guardando ? "Guardando..." : "Confirmar cambio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
