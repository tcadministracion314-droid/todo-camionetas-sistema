import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useProductos } from "../../hooks/useProductos";
import { useVentasHoy } from "../../hooks/useVentasHoy";
import { actualizarMetodoPagoVenta } from "../../lib/firestore/ventas";
import { METODOS_PAGO } from "../../lib/constants";
import { formatoCLP } from "../../lib/format";
import NuevaVentaForm from "./NuevaVentaForm";
import VentaEncargoModal from "./VentaEncargoModal";

function tieneStock(producto) {
  return (producto.proveedores || []).some((p) => (p.stock || 0) > 0);
}

function VentaCard({ venta }) {
  const [editando, setEditando] = useState(false);

  async function cambiarMetodoPago(valor) {
    setEditando(false);
    if (valor === venta.metodoPago) return;
    await actualizarMetodoPagoVenta(venta.id, valor);
  }

  const hora = venta.fecha?.toDate
    ? venta.fecha.toDate().toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="flex items-center justify-between border-2 border-marca-azul/30 p-3">
      <div>
        <p className="font-bold text-marca-azul">
          {venta.productoNombre}{" "}
          <span className="font-normal text-marca-azul/70">
            × {venta.cantidad}
          </span>
        </p>
        <p className="text-sm text-marca-azul/70">
          {hora} — {venta.proveedorNombre}
        </p>
      </div>
      <div className="text-right">
        <p className="font-black text-marca-azul">{formatoCLP(venta.total)}</p>
        {editando ? (
          <select
            autoFocus
            defaultValue={venta.metodoPago}
            onChange={(e) => cambiarMetodoPago(e.target.value)}
            onBlur={() => setEditando(false)}
            className="mt-1 border-2 border-marca-rojo px-2 py-1 text-sm outline-none"
          >
            {METODOS_PAGO.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="mt-1 text-sm font-bold text-marca-azul hover:underline"
          >
            {METODOS_PAGO.find((m) => m.value === venta.metodoPago)?.label ??
              venta.metodoPago}{" "}
            (editar)
          </button>
        )}
      </div>
    </div>
  );
}

export default function VentasPage() {
  const { user } = useAuth();
  const { productos } = useProductos();
  const { ventasHoy } = useVentasHoy(user?.uid);
  const [modalEncargoAbierto, setModalEncargoAbierto] = useState(false);

  const productosVendibles = useMemo(
    () => productos.filter(tieneStock),
    [productos]
  );

  const totalHoy = ventasHoy.reduce((acc, v) => acc + (v.total || 0), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase text-marca-azul">Ventas</h1>
        <button
          type="button"
          onClick={() => setModalEncargoAbierto(true)}
          className="border-2 border-marca-rojo px-5 py-2 font-black uppercase text-marca-rojo hover:bg-marca-rojo/10"
        >
          + Venta por encargo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-black uppercase text-marca-azul">
            Nueva venta
          </h2>
          <NuevaVentaForm productos={productosVendibles} vendedor={user} />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase text-marca-azul">
              Mis ventas de hoy
            </h2>
            <p className="font-black text-marca-azul">{formatoCLP(totalHoy)}</p>
          </div>
          <div className="space-y-2">
            {ventasHoy.length === 0 && (
              <p className="text-marca-azul/70">Todavía no registras ventas hoy.</p>
            )}
            {ventasHoy.map((v) => (
              <VentaCard key={v.id} venta={v} />
            ))}
          </div>
        </div>
      </div>

      {modalEncargoAbierto && (
        <VentaEncargoModal
          vendedor={user}
          onClose={() => setModalEncargoAbierto(false)}
        />
      )}
    </div>
  );
}
