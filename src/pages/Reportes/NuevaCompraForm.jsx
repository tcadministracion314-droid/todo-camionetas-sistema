import { useState } from "react";
import BuscadorProducto from "../../components/BuscadorProducto";
import CampoConSugerencias from "../../components/CampoConSugerencias";
import { useCatalogo } from "../../hooks/useCatalogo";
import { CATEGORIAS } from "../../lib/constants";
import { formatoCLP } from "../../lib/format";
import {
  registrarCompraProductoExistente,
  registrarCompraProductoNuevo,
} from "../../lib/firestore/compras";

const NUEVO_VACIO = {
  nombre: "",
  marcaRepuesto: "",
  marcaVehiculo: "",
  categoria: "repuesto",
  modelo: "",
};

export default function NuevaCompraForm({ productos, comprador }) {
  const [modo, setModo] = useState("existente"); // "existente" | "nuevo"

  const [producto, setProducto] = useState(null);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [nuevo, setNuevo] = useState(NUEVO_VACIO);
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const { valores: marcasRepuesto } = useCatalogo("marcasRepuesto");
  const { valores: marcasVehiculo } = useCatalogo("marcasVehiculo");
  const { valores: proveedoresSugeridos } = useCatalogo("proveedores");

  function seleccionarProducto(p) {
    setProducto(p);
    const existente = p.proveedores?.[0];
    setProveedorNombre(existente?.nombre || "");
    setCostoUnitario(existente?.costo ?? "");
    setError("");
  }

  function cambiarModo(m) {
    setModo(m);
    setProducto(null);
    setProveedorNombre("");
    setNuevo(NUEVO_VACIO);
    setCantidad("1");
    setCostoUnitario("");
    setError("");
  }

  const cantidadNum = Number(cantidad) || 0;
  const costoNum = Number(costoUnitario) || 0;
  const total = cantidadNum * costoNum;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setExito("");

    if (!proveedorNombre.trim()) return setError("Ingresa a quién se le compra.");
    if (cantidadNum <= 0) return setError("La cantidad debe ser mayor a 0.");
    if (costoNum <= 0) return setError("Ingresa el costo unitario.");

    if (modo === "existente" && !producto) {
      return setError("Busca y selecciona el producto comprado.");
    }
    if (modo === "nuevo") {
      if (!nuevo.nombre.trim()) return setError("Ingresa el nombre del producto.");
      if (!nuevo.marcaRepuesto.trim()) return setError("Ingresa la marca del repuesto.");
    }

    setGuardando(true);
    try {
      if (modo === "existente") {
        await registrarCompraProductoExistente({
          producto,
          proveedorNombre: proveedorNombre.trim(),
          cantidad: cantidadNum,
          costoUnitario: costoNum,
          comprador,
        });
      } else {
        await registrarCompraProductoNuevo({
          nombre: nuevo.nombre.trim(),
          marcaRepuesto: nuevo.marcaRepuesto.trim(),
          marcaVehiculo: nuevo.marcaVehiculo.trim(),
          categoria: nuevo.categoria,
          modelo: nuevo.modelo.trim(),
          proveedorNombre: proveedorNombre.trim(),
          cantidad: cantidadNum,
          costoUnitario: costoNum,
          comprador,
        });
      }

      setExito("Compra registrada y stock actualizado.");
      setProducto(null);
      setProveedorNombre("");
      setNuevo(NUEVO_VACIO);
      setCantidad("1");
      setCostoUnitario("");
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo registrar la compra. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-2 border-marca-azul p-4">
      <div className="flex border-2 border-marca-azul">
        <button
          type="button"
          onClick={() => cambiarModo("existente")}
          className={`flex-1 px-4 py-2 text-sm font-black uppercase ${
            modo === "existente" ? "bg-marca-azul text-white" : "text-marca-azul"
          }`}
        >
          Producto existente
        </button>
        <button
          type="button"
          onClick={() => cambiarModo("nuevo")}
          className={`flex-1 px-4 py-2 text-sm font-black uppercase ${
            modo === "nuevo" ? "bg-marca-azul text-white" : "text-marca-azul"
          }`}
        >
          Producto nuevo
        </button>
      </div>

      {modo === "existente" ? (
        <>
          <BuscadorProducto
            productos={productos}
            onSeleccionar={seleccionarProducto}
            label="Buscar producto comprado"
          />
          {producto && (
            <div className="border-2 border-marca-azul/30 bg-marca-azul/5 p-3">
              <p className="font-bold text-marca-azul">{producto.nombre}</p>
              <p className="text-sm text-marca-azul/70">
                {producto.marcaRepuesto}
                {producto.modelo ? ` · ${producto.modelo}` : ""}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Nombre del producto
            </label>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo((prev) => ({ ...prev, nombre: e.target.value }))}
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CampoConSugerencias
              id="compraMarcaRepuesto"
              label="Marca del repuesto"
              value={nuevo.marcaRepuesto}
              onChange={(v) => setNuevo((prev) => ({ ...prev, marcaRepuesto: v }))}
              sugerencias={marcasRepuesto}
              required
            />
            <CampoConSugerencias
              id="compraMarcaVehiculo"
              label="Marca del vehículo (opcional)"
              value={nuevo.marcaVehiculo}
              onChange={(v) => setNuevo((prev) => ({ ...prev, marcaVehiculo: v }))}
              sugerencias={marcasVehiculo}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Categoría
              </label>
              <select
                value={nuevo.categoria}
                onChange={(e) => setNuevo((prev) => ({ ...prev, categoria: e.target.value }))}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Modelo (opcional)
              </label>
              <input
                value={nuevo.modelo}
                onChange={(e) => setNuevo((prev) => ({ ...prev, modelo: e.target.value }))}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>
        </div>
      )}

      <CampoConSugerencias
        id="compraProveedor"
        label="¿A quién se le compra?"
        value={proveedorNombre}
        onChange={setProveedorNombre}
        sugerencias={proveedoresSugeridos}
        required
      />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">Cantidad</label>
          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">
            Costo unitario
          </label>
          <input
            type="number"
            min="0"
            value={costoUnitario}
            onChange={(e) => setCostoUnitario(e.target.value)}
            className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-sm font-bold text-marca-azul">Total</p>
          <p className="text-lg font-black text-marca-azul">{formatoCLP(total)}</p>
        </div>
      </div>

      {error && <p className="font-bold text-marca-rojo">{error}</p>}
      {exito && <p className="font-bold text-green-700">{exito}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="w-full bg-marca-rojo px-6 py-3 font-black uppercase text-white hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Registrando..." : "Registrar compra"}
      </button>
    </form>
  );
}
