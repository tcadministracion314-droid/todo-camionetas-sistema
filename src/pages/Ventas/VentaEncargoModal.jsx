import { useState } from "react";
import CampoConSugerencias from "../../components/CampoConSugerencias";
import { useCatalogo } from "../../hooks/useCatalogo";
import { METODOS_PAGO } from "../../lib/constants";
import { buscarOCrearCliente } from "../../lib/firestore/clientes";
import { crearEncargo } from "../../lib/firestore/encargos";

const FORM_VACIO = {
  clienteNombre: "",
  clienteTelefono: "",
  clienteCorreo: "",
  vehiculoMarca: "",
  vehiculoModelo: "",
  vehiculoAnio: "",
  descripcionProducto: "",
  marcaRepuesto: "",
  proveedor: "",
  costo: "",
  precioVenta: "",
  pagoCompleto: false,
  montoAbonado: "",
  metodoPagoAbono: "",
  fechaEstimadaLlegada: "",
};

export default function VentaEncargoModal({ onClose, vendedor }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const { valores: marcasVehiculo } = useCatalogo("marcasVehiculo");
  const { valores: marcasRepuesto } = useCatalogo("marcasRepuesto");
  const { valores: proveedoresSugeridos } = useCatalogo("proveedores");

  function campo(nombre, valor) {
    setForm((prev) => ({ ...prev, [nombre]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.clienteNombre.trim()) return setError("Ingresa el nombre del cliente.");
    if (!form.clienteTelefono.trim()) return setError("Ingresa el teléfono del cliente.");
    if (!form.descripcionProducto.trim())
      return setError("Describe el producto que se está encargando.");
    if (!form.proveedor.trim())
      return setError("Ingresa a quién se le compra o encarga el producto.");
    if (!form.precioVenta || Number(form.precioVenta) <= 0)
      return setError("Ingresa el precio de venta acordado con el cliente.");
    if (!form.pagoCompleto && !form.metodoPagoAbono)
      return setError("Elige el método de pago del abono.");
    if (!form.fechaEstimadaLlegada)
      return setError("Ingresa la fecha estimada de llegada.");

    const montoAbonado = form.pagoCompleto
      ? Number(form.precioVenta)
      : Number(form.montoAbonado) || 0;

    setGuardando(true);
    try {
      const clienteId = await buscarOCrearCliente({
        nombre: form.clienteNombre,
        telefono: form.clienteTelefono,
        correo: form.clienteCorreo,
      });

      await crearEncargo({
        clienteId,
        clienteNombre: form.clienteNombre.trim(),
        clienteTelefono: form.clienteTelefono.trim(),
        clienteCorreo: form.clienteCorreo.trim() || null,
        vehiculoMarca: form.vehiculoMarca || null,
        vehiculoModelo: form.vehiculoModelo || null,
        vehiculoAnio: form.vehiculoAnio ? Number(form.vehiculoAnio) : null,
        descripcionProducto: form.descripcionProducto.trim(),
        marcaRepuesto: form.marcaRepuesto.trim() || null,
        proveedor: form.proveedor.trim(),
        costo: form.costo ? Number(form.costo) : null,
        precioTotal: Number(form.precioVenta),
        montoAbonado,
        metodoPagoAbono: form.pagoCompleto ? "efectivo" : form.metodoPagoAbono,
        estadoPago: montoAbonado >= Number(form.precioVenta) ? "pagado" : "abonado",
        vendedorId: vendedor.uid,
        vendedorEmail: vendedor.email,
        fechaEstimadaLlegada: form.fechaEstimadaLlegada,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError("No se pudo registrar el encargo. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-4 border-marca-rojo bg-white p-6">
        <h2 className="mb-4 text-xl font-black uppercase text-marca-azul">
          Venta por encargo
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-black uppercase text-marca-rojo">
              Datos del cliente
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Nombre
                </label>
                <input
                  required
                  value={form.clienteNombre}
                  onChange={(e) => campo("clienteNombre", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Teléfono
                </label>
                <input
                  required
                  value={form.clienteTelefono}
                  onChange={(e) => campo("clienteTelefono", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Correo (opcional)
              </label>
              <input
                type="email"
                value={form.clienteCorreo}
                onChange={(e) => campo("clienteCorreo", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black uppercase text-marca-rojo">
              Información del vehículo
            </p>
            <div className="grid grid-cols-3 gap-4">
              <CampoConSugerencias
                id="vehiculoMarca"
                label="Marca"
                value={form.vehiculoMarca}
                onChange={(v) => campo("vehiculoMarca", v)}
                sugerencias={marcasVehiculo}
              />
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Modelo
                </label>
                <input
                  value={form.vehiculoModelo}
                  onChange={(e) => campo("vehiculoModelo", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Año
                </label>
                <input
                  type="number"
                  value={form.vehiculoAnio}
                  onChange={(e) => campo("vehiculoAnio", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black uppercase text-marca-rojo">
              Producto encargado
            </p>
            <div className="mb-2">
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Descripción del producto
              </label>
              <input
                required
                value={form.descripcionProducto}
                onChange={(e) => campo("descripcionProducto", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CampoConSugerencias
                id="marcaRepuestoEncargo"
                label="Marca del repuesto (si se sabe)"
                value={form.marcaRepuesto}
                onChange={(v) => campo("marcaRepuesto", v)}
                sugerencias={marcasRepuesto}
              />
              <CampoConSugerencias
                id="proveedorEncargo"
                label="¿A quién se le compra/encarga?"
                value={form.proveedor}
                onChange={(v) => campo("proveedor", v)}
                sugerencias={proveedoresSugeridos}
                required
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Costo
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.costo}
                  onChange={(e) => campo("costo", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Precio de venta acordado
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.precioVenta}
                  onChange={(e) => campo("precioVenta", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-black uppercase text-marca-rojo">
              Pago
            </p>
            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-marca-azul">
              <input
                type="checkbox"
                checked={form.pagoCompleto}
                onChange={(e) => campo("pagoCompleto", e.target.checked)}
              />
              Pago completo (no queda saldo pendiente)
            </label>

            {!form.pagoCompleto && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-marca-azul">
                    Monto del abono
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.montoAbonado}
                    onChange={(e) => campo("montoAbonado", e.target.value)}
                    className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-marca-azul">
                    Método de pago del abono
                  </label>
                  <select
                    value={form.metodoPagoAbono}
                    onChange={(e) => campo("metodoPagoAbono", e.target.value)}
                    className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                  >
                    <option value="">Elige...</option>
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mt-2">
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Fecha estimada de llegada
              </label>
              <input
                type="date"
                required
                value={form.fechaEstimadaLlegada}
                onChange={(e) => campo("fechaEstimadaLlegada", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

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
              {guardando ? "Guardando..." : "Registrar encargo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
