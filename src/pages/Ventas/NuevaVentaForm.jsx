import { useState } from "react";
import BuscadorProducto from "../../components/BuscadorProducto";
import { METODOS_PAGO } from "../../lib/constants";
import { registrarVenta } from "../../lib/firestore/ventas";
import { formatoCLP } from "../../lib/format";

const LINEA_VACIA = {
  producto: null,
  proveedorNombre: "",
  cantidad: "1",
  precioUnitario: "",
};

export default function NuevaVentaForm({ productos, vendedor }) {
  const [carrito, setCarrito] = useState([]);
  const [linea, setLinea] = useState(LINEA_VACIA);
  const [descuentoTipo, setDescuentoTipo] = useState("porcentaje");
  const [descuentoValor, setDescuentoValor] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const proveedoresConStock = (linea.producto?.proveedores || []).filter(
    (p) => (p.stock || 0) > 0
  );
  const proveedorElegido = proveedoresConStock.find(
    (p) => p.nombre === linea.proveedorNombre
  );

  function seleccionarProducto(producto) {
    const disponibles = (producto.proveedores || []).filter((p) => (p.stock || 0) > 0);
    const unico = disponibles.length === 1 ? disponibles[0] : null;
    setLinea({
      producto,
      proveedorNombre: unico?.nombre || "",
      cantidad: "1",
      precioUnitario: unico?.venta ?? "",
    });
    setError("");
  }

  function elegirProveedor(nombre) {
    const prov = proveedoresConStock.find((p) => p.nombre === nombre);
    setLinea((prev) => ({
      ...prev,
      proveedorNombre: nombre,
      precioUnitario: prov?.venta ?? "",
      cantidad: "1",
    }));
  }

  const cantidadLineaNum = Number(linea.cantidad) || 0;
  const precioLineaNum = Number(linea.precioUnitario) || 0;

  function agregarAlCarrito() {
    setError("");
    if (!linea.producto) return setError("Busca y selecciona un producto.");
    if (!linea.proveedorNombre) return setError("Elige de qué proveedor sale el stock.");
    if (cantidadLineaNum <= 0) return setError("La cantidad debe ser mayor a 0.");
    if (proveedorElegido && cantidadLineaNum > (proveedorElegido.stock || 0)) {
      return setError(`No hay stock suficiente (quedan ${proveedorElegido.stock}).`);
    }
    if (precioLineaNum <= 0) return setError("Ingresa un precio de venta válido.");

    setCarrito((prev) => [
      ...prev,
      {
        producto: linea.producto,
        proveedorNombre: linea.proveedorNombre,
        cantidad: cantidadLineaNum,
        precioUnitario: precioLineaNum,
      },
    ]);
    setLinea(LINEA_VACIA);
  }

  function quitarDelCarrito(index) {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = carrito.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);
  const descuentoMonto =
    descuentoTipo === "porcentaje"
      ? Math.round((subtotal * (Number(descuentoValor) || 0)) / 100)
      : Number(descuentoValor) || 0;
  const total = Math.max(0, subtotal - descuentoMonto);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (carrito.length === 0) return setError("Agrega al menos un producto a la venta.");
    if (!metodoPago) return setError("Elige el método de pago.");

    setGuardando(true);
    try {
      await registrarVenta({
        items: carrito,
        descuentoTipo,
        descuentoValor: Number(descuentoValor) || 0,
        metodoPago,
        vendedor,
      });
      setCarrito([]);
      setLinea(LINEA_VACIA);
      setDescuentoValor("");
      setMetodoPago("");
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo registrar la venta. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border-2 border-marca-azul p-4"
    >
      <BuscadorProducto productos={productos} onSeleccionar={seleccionarProducto} />

      {linea.producto && (
        <div className="border-2 border-marca-azul/30 bg-marca-azul/5 p-3">
          <p className="font-bold text-marca-azul">{linea.producto.nombre}</p>
          <p className="text-sm text-marca-azul/70">
            {linea.producto.marcaRepuesto}
            {linea.producto.modelo ? ` · ${linea.producto.modelo}` : ""}
          </p>
        </div>
      )}

      {linea.producto && proveedoresConStock.length > 1 && (
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">
            ¿De qué proveedor sale? (tiene stock en más de uno)
          </label>
          <select
            value={linea.proveedorNombre}
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

      {linea.producto && linea.proveedorNombre && (
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
                value={linea.cantidad}
                onChange={(e) => setLinea((prev) => ({ ...prev, cantidad: e.target.value }))}
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
                value={linea.precioUnitario}
                onChange={(e) =>
                  setLinea((prev) => ({ ...prev, precioUnitario: e.target.value }))
                }
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={agregarAlCarrito}
            className="w-full border-2 border-marca-azul px-4 py-2 font-black uppercase text-marca-azul hover:bg-marca-azul/10"
          >
            + Agregar a la venta
          </button>
        </>
      )}

      {carrito.length > 0 && (
        <div className="space-y-2 border-t-2 border-marca-azul/20 pt-3">
          {carrito.map((it, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-2 border-marca-azul/20 p-2"
            >
              <div>
                <p className="font-bold text-marca-azul">
                  {it.producto.nombre}{" "}
                  <span className="font-normal text-marca-azul/70">× {it.cantidad}</span>
                </p>
                <p className="text-sm text-marca-azul/70">{it.proveedorNombre}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-marca-azul">
                  {formatoCLP(it.cantidad * it.precioUnitario)}
                </p>
                <button
                  type="button"
                  onClick={() => quitarDelCarrito(index)}
                  className="text-sm font-bold text-marca-rojo hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {carrito.length > 0 && (
        <>
          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Descuento (sobre toda la venta)
            </label>
            <div className="flex gap-2">
              <div className="flex border-2 border-marca-azul">
                <button
                  type="button"
                  onClick={() => setDescuentoTipo("porcentaje")}
                  className={`px-4 py-2 font-black ${
                    descuentoTipo === "porcentaje"
                      ? "bg-marca-azul text-white"
                      : "text-marca-azul"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDescuentoTipo("monto")}
                  className={`px-4 py-2 font-black ${
                    descuentoTipo === "monto" ? "bg-marca-azul text-white" : "text-marca-azul"
                  }`}
                >
                  $
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={descuentoValor}
                onChange={(e) => setDescuentoValor(e.target.value)}
                placeholder="0"
                className="flex-1 border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Método de pago
            </label>
            <div className="flex flex-wrap gap-2">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetodoPago(m.value)}
                  className={`px-4 py-2 text-sm font-black uppercase ${
                    metodoPago === m.value
                      ? "bg-marca-rojo text-white"
                      : "bg-marca-azul/10 text-marca-azul"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-marca-azul/20 pt-3 text-right">
            <p className="text-sm text-marca-azul/70">Subtotal: {formatoCLP(subtotal)}</p>
            {descuentoMonto > 0 && (
              <p className="text-sm text-marca-rojo">
                Descuento: -{formatoCLP(descuentoMonto)}
              </p>
            )}
            <p className="text-xl font-black text-marca-azul">Total: {formatoCLP(total)}</p>
          </div>
        </>
      )}

      {error && <p className="font-bold text-marca-rojo">{error}</p>}

      <button
        type="submit"
        disabled={guardando || carrito.length === 0}
        className="w-full bg-marca-rojo px-6 py-3 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Registrando..." : "Registrar venta"}
      </button>
    </form>
  );
}
