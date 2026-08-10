import { useState } from "react";
import { useProveedores } from "../../hooks/useProveedores";
import { actualizarDiasCreditoProveedor } from "../../lib/firestore/catalogo";

function FilaProveedor({ proveedor }) {
  const [valor, setValor] = useState(proveedor.diasCredito ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (Number(valor || 0) === (proveedor.diasCredito ?? 0)) return;
    setGuardando(true);
    try {
      await actualizarDiasCreditoProveedor(proveedor.id, valor);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-marca-azul/10 py-2">
      <span className="text-sm text-marca-azul">{proveedor.nombre}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={guardar}
          placeholder="0 = contado"
          disabled={guardando}
          className="w-24 border-2 border-marca-azul px-2 py-1 text-right text-sm outline-none focus:border-marca-rojo"
        />
        <span className="text-xs text-marca-azul/70">días</span>
      </div>
    </div>
  );
}

export default function ConfiguracionCreditoProveedores() {
  const { proveedores, loading } = useProveedores();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="mb-4 border-2 border-marca-azul/30 p-3">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-black uppercase text-marca-azul"
      >
        <span>{abierto ? "▼" : "▶"} Días de crédito por proveedor</span>
      </button>
      {abierto &&
        (loading ? (
          <p className="mt-2 text-sm text-marca-azul/70">Cargando...</p>
        ) : (
          <div className="mt-2">
            {proveedores.length === 0 && (
              <p className="text-sm text-marca-azul/70">Todavía no hay proveedores cargados.</p>
            )}
            {proveedores.map((p) => (
              <FilaProveedor key={p.id} proveedor={p} />
            ))}
          </div>
        ))}
    </div>
  );
}
