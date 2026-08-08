import { useState } from "react";
import BuscadorProducto from "./BuscadorProducto";
import { METODOS_PAGO } from "../../lib/constants";
import { registrarVenta } from "../../lib/firestore/ventas";
import { formatoCLP } from "../../lib/format";

const FORM_VACIO = {
  producto: null,
  proveedorNombre: "",
  cantidad: "1",
  precioUnitario: "",
  descuentoTipo: "porcentaje",
  descuentoValor: "",
  metodoPago: "",
};

export default function NuevaVentaForm({ productos, vendedor }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const proveedoresConStock = (form.producto?.proveedores || []).filter(
    (p) => (p.stock || 0) > 0
  );
  const proveedorElegido = proveedoresConStock.find(
    (p) => p.nombre === form.proveedorNombre
  );

  function seleccionarProducto(producto) {
    const disponibles = (producto.proveedores || []).filter((p) => (p.stock || 0) > 0);
    const unico = disponibles.length === 1 ? disponibles[0] : null;
    setForm({
      ...FORM_VACIO,
      producto,
      proveedorNombre: unico?.nombre || "",
      precioUnitario: unico?.venta ?? "",
    });
    setError("");
  }

  function elegirProveedor(nombre) {
    const prov = proveedoresConStock.find((p) => p.nombre === nombre);
    setForm((prev) => ({
      ...prev,
      proveedorNombre: nombre,
      precioUnitario: prov?.venta ?? "",
      cantidad: "1",
    }));
  }

  const cantidadNum = Number(form.cantidad) || 0;
  const precioNum = Number(form.precioUnitario) || 0;
  const subtotal = cantidadNum * precioNum;
  const descuentoMonto =
    form.descuentoTipo === "porcentaje"
      ? Math.round((subtotal * (Number(form.descuentoValor) || 0)) / 100)
      : Number(form.descuentoValor) || 0;
  const total = Math.max(0, subtotal - descuentoMonto);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.producto) return setError("Busca y selecciona un producto.");
    if (!form.proveedorNombre) return setError("Elige de qué proveedor sale el stock.");
    if (cantidadNum <= 0) return setError("La cantidad debe ser mayor a 0.");
    if (proveedorElegido && cantidadNum > (proveedorElegido.stock || 0)) {
      return setError(`No hay stock suficiente (quedan ${proveedorElegido.stock}).`);
    }
    if (precioNum <= 0) return setError("Ingresa un precio de venta válido.");
    if (!form.metodoPago) return setError("Elige el método de pago.");

    setGuardando(true);
    try {
      await registrarVenta({
        producto: form.producto,
        proveedorNombre: form.proveedorNombre,
        cantidad: cantidadNum,
        precioUnitario: precioNum,
        descuentoTipo: form.descuentoTipo,
        descuentoValor: Number(form.descuentoValor) || 0,
        metodoPago: form.metodoPago,
        vendedor,
      });
      setForm(FORM_VACIO);
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

      {form.producto && (
        <div className="border-2 border-marca-azul/30 bg-marca-azul/5 p-3">
          <p className="font-bold text-marca-azul">{form.producto.nombre}</p>
          <p className="text-sm text-marca-azul/70">
            {form.producto.marcaRepuesto}
            {form.producto.modelo ? ` · ${form.producto.modelo}` : ""}
          </p>
        </div>
      )}

      {form.producto && proveedoresConStock.length > 1 && (
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">
            ¿De qué proveedor sale? (tiene stock en más de uno)
          </label>
          <select
            value={form.proveedorNombre}
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

      {form.producto && form.proveedorNombre && (
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
                value={form.cantidad}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cantidad: e.target.value }))
                }
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
                value={form.precioUnitario}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, precioUnitario: e.target.value }))
                }
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Descuento
            </label>
            <div className="flex gap-2">
              <div className="flex border-2 border-marca-azul">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, descuentoTipo: "porcentaje" }))
                  }
                  className={`px-4 py-2 font-black ${
                    form.descuentoTipo === "porcentaje"
                      ? "bg-marca-azul text-white"
                      : "text-marca-azul"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, descuentoTipo: "monto" }))
                  }
                  className={`px-4 py-2 font-black ${
                    form.descuentoTipo === "monto"
                      ? "bg-marca-azul text-white"
                      : "text-marca-azul"
                  }`}
                >
                  $
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={form.descuentoValor}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descuentoValor: e.target.value }))
                }
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
                  onClick={() =>
                    setForm((prev) => ({ ...prev, metodoPago: m.value }))
                  }
                  className={`px-4 py-2 text-sm font-black uppercase ${
                    form.metodoPago === m.value
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
            <p className="text-sm text-marca-azul/70">
              Subtotal: {formatoCLP(subtotal)}
            </p>
            {descuentoMonto > 0 && (
              <p className="text-sm text-marca-rojo">
                Descuento: -{formatoCLP(descuentoMonto)}
              </p>
            )}
            <p className="text-xl font-black text-marca-azul">
              Total: {formatoCLP(total)}
            </p>
          </div>
        </>
      )}

      {error && <p className="font-bold text-marca-rojo">{error}</p>}

      <button
        type="submit"
        disabled={guardando || !form.producto}
        className="w-full bg-marca-rojo px-6 py-3 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Registrando..." : "Registrar venta"}
      </button>
    </form>
  );
}
