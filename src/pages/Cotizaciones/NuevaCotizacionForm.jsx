import { useState } from "react";
import CampoConSugerencias from "../../components/CampoConSugerencias";
import { useCatalogo } from "../../hooks/useCatalogo";
import { buscarOCrearCliente } from "../../lib/firestore/clientes";
import { crearCotizacion } from "../../lib/firestore/cotizaciones";
import { formatoCLP } from "../../lib/format";

const ITEM_VACIO = {
  vehiculoMarca: "",
  vehiculoModelo: "",
  vehiculoAnio: "",
  descripcionProducto: "",
  marcaRepuesto: "",
  proveedor: "",
  costo: "",
  precioSugerido: "",
  cantidad: "1",
};

export default function NuevaCotizacionForm({ vendedor }) {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteCorreo, setClienteCorreo] = useState("");
  const [items, setItems] = useState([{ ...ITEM_VACIO }]);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const { valores: marcasVehiculo } = useCatalogo("marcasVehiculo");
  const { valores: marcasRepuesto } = useCatalogo("marcasRepuesto");
  const { valores: proveedoresSugeridos } = useCatalogo("proveedores");

  function actualizarItem(index, campo, valor) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [campo]: valor } : it)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, { ...ITEM_VACIO }]);
  }

  function quitarItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = items.reduce(
    (acc, it) => acc + (Number(it.precioSugerido) || 0) * (Number(it.cantidad) || 0),
    0
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const itemsValidos = items.filter((it) => it.descripcionProducto.trim());
    if (itemsValidos.length === 0) {
      return setError("Describe al menos un producto consultado.");
    }

    setGuardando(true);
    try {
      let clienteId = null;
      if (clienteTelefono.trim()) {
        clienteId = await buscarOCrearCliente({
          nombre: clienteNombre,
          telefono: clienteTelefono,
          correo: clienteCorreo,
        });
      }

      await crearCotizacion({
        vendedorId: vendedor.uid,
        vendedorEmail: vendedor.email,
        clienteId,
        clienteNombre: clienteNombre.trim() || null,
        clienteTelefono: clienteTelefono.trim() || null,
        clienteCorreo: clienteCorreo.trim() || null,
        items: itemsValidos.map((it) => ({
          vehiculoMarca: it.vehiculoMarca || null,
          vehiculoModelo: it.vehiculoModelo || null,
          vehiculoAnio: it.vehiculoAnio ? Number(it.vehiculoAnio) : null,
          descripcionProducto: it.descripcionProducto.trim(),
          marcaRepuesto: it.marcaRepuesto?.trim() || null,
          proveedor: it.proveedor?.trim() || null,
          costo: it.costo ? Number(it.costo) : null,
          precioSugerido: it.precioSugerido !== "" ? Number(it.precioSugerido) : null,
          cantidad: Number(it.cantidad) || 1,
        })),
        notas: notas.trim() || null,
      });

      setClienteNombre("");
      setClienteTelefono("");
      setClienteCorreo("");
      setItems([{ ...ITEM_VACIO }]);
      setNotas("");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la cotización. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-2 border-marca-azul p-4">
      <div>
        <p className="mb-2 text-sm font-black uppercase text-marca-rojo">
          Datos del cliente (opcional)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Nombre"
            className="border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
          <input
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
            placeholder="Teléfono"
            className="border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
          <input
            type="email"
            value={clienteCorreo}
            onChange={(e) => setClienteCorreo(e.target.value)}
            placeholder="Correo"
            className="border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black uppercase text-marca-rojo">
            Productos consultados
          </p>
          <button
            type="button"
            onClick={agregarItem}
            className="text-sm font-bold text-marca-azul hover:underline"
          >
            + Agregar otro producto
          </button>
        </div>

        {items.map((it, index) => (
          <div key={index} className="border-2 border-marca-azul/30 p-3">
            <div className="mb-2">
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Descripción del producto
              </label>
              <input
                value={it.descripcionProducto}
                onChange={(e) =>
                  actualizarItem(index, "descripcionProducto", e.target.value)
                }
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>

            <div className="mb-2 grid grid-cols-3 gap-2">
              <CampoConSugerencias
                id={`vehiculoMarca-${index}`}
                label="Marca del vehículo"
                value={it.vehiculoMarca}
                onChange={(v) => actualizarItem(index, "vehiculoMarca", v)}
                sugerencias={marcasVehiculo}
              />
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Modelo
                </label>
                <input
                  value={it.vehiculoModelo}
                  onChange={(e) => actualizarItem(index, "vehiculoModelo", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Año
                </label>
                <input
                  type="number"
                  value={it.vehiculoAnio}
                  onChange={(e) => actualizarItem(index, "vehiculoAnio", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2">
              <CampoConSugerencias
                id={`marcaRepuesto-${index}`}
                label="Marca del repuesto (si se sabe)"
                value={it.marcaRepuesto}
                onChange={(v) => actualizarItem(index, "marcaRepuesto", v)}
                sugerencias={marcasRepuesto}
              />
              <CampoConSugerencias
                id={`proveedor-${index}`}
                label="¿A quién se le compraría?"
                value={it.proveedor}
                onChange={(v) => actualizarItem(index, "proveedor", v)}
                sugerencias={proveedoresSugeridos}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-marca-azul">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={it.cantidad}
                  onChange={(e) => actualizarItem(index, "cantidad", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-marca-azul">
                  Costo
                </label>
                <input
                  type="number"
                  min="0"
                  value={it.costo}
                  onChange={(e) => actualizarItem(index, "costo", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-marca-azul">
                  Precio sugerido
                </label>
                <input
                  type="number"
                  min="0"
                  value={it.precioSugerido}
                  onChange={(e) => actualizarItem(index, "precioSugerido", e.target.value)}
                  placeholder="A confirmar"
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                />
              </div>
              <div className="flex items-end justify-between">
                <p className="text-sm font-bold text-marca-azul">
                  {it.precioSugerido
                    ? formatoCLP(Number(it.precioSugerido) * (Number(it.cantidad) || 0))
                    : "—"}
                </p>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarItem(index)}
                    className="text-sm font-bold text-marca-rojo hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <p className="text-right text-lg font-black text-marca-azul">
          Total sugerido: {formatoCLP(total)}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-marca-azul">
          Notas (opcional)
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
        />
      </div>

      {error && <p className="font-bold text-marca-rojo">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="w-full bg-marca-rojo px-6 py-3 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar cotización"}
      </button>
    </form>
  );
}
