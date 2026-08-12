import { useState } from "react";
import BuscadorProducto from "../../components/BuscadorProducto";
import CampoConSugerencias from "../../components/CampoConSugerencias";
import { useCatalogo } from "../../hooks/useCatalogo";
import { CATEGORIAS, SUBCATEGORIAS_ACCESORIO } from "../../lib/constants";
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
  subcategoria: SUBCATEGORIAS_ACCESORIO[0],
  tipoRepuesto: "",
  modelo: "",
  anioDesde: "",
  anioHasta: "",
  codigoOriginal: "",
  glosaTecnica: "",
};

export default function NuevaCompraForm({ productos, comprador }) {
  const [modo, setModo] = useState("existente"); // "existente" | "nuevo"

  const [producto, setProducto] = useState(null);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [codigoProveedor, setCodigoProveedor] = useState("");
  const [nuevo, setNuevo] = useState(NUEVO_VACIO);
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const { valores: marcasRepuesto } = useCatalogo("marcasRepuesto");
  const { valores: marcasVehiculo } = useCatalogo("marcasVehiculo");
  const { valores: tiposRepuesto } = useCatalogo("tiposRepuesto");
  const { valores: proveedoresSugeridos } = useCatalogo("proveedores");

  function seleccionarProducto(p) {
    setProducto(p);
    const existente = p.proveedores?.[0];
    setProveedorNombre(existente?.nombre || "");
    setCodigoProveedor(existente?.codigo || "");
    setCostoUnitario(existente?.costo ?? "");
    setPrecioVenta(existente?.venta ?? "");
    setError("");
  }

  function campoNuevo(nombre, valor) {
    setNuevo((prev) => ({ ...prev, [nombre]: valor }));
  }

  function cambiarModo(m) {
    setModo(m);
    setProducto(null);
    setProveedorNombre("");
    setCodigoProveedor("");
    setNuevo(NUEVO_VACIO);
    setCantidad("1");
    setCostoUnitario("");
    setPrecioVenta("");
    setNumeroFactura("");
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
          codigoProveedor: codigoProveedor.trim(),
          cantidad: cantidadNum,
          costoUnitario: costoNum,
          precioVenta,
          comprador,
          numeroFactura: numeroFactura.trim(),
          fechaFactura,
        });
      } else {
        await registrarCompraProductoNuevo({
          nombre: nuevo.nombre.trim(),
          marcaRepuesto: nuevo.marcaRepuesto.trim(),
          marcaVehiculo: nuevo.marcaVehiculo.trim(),
          categoria: nuevo.categoria,
          subcategoria: nuevo.subcategoria,
          tipoRepuesto: nuevo.tipoRepuesto.trim(),
          modelo: nuevo.modelo.trim(),
          anioDesde: nuevo.anioDesde,
          anioHasta: nuevo.anioHasta,
          codigoOriginal: nuevo.codigoOriginal.trim(),
          glosaTecnica: nuevo.glosaTecnica.trim(),
          proveedorNombre: proveedorNombre.trim(),
          codigoProveedor: codigoProveedor.trim(),
          cantidad: cantidadNum,
          costoUnitario: costoNum,
          precioVenta,
          comprador,
          numeroFactura: numeroFactura.trim(),
          fechaFactura,
        });
      }

      setExito(
        numeroFactura.trim()
          ? "Compra registrada, stock actualizado y sumada a la factura."
          : "Compra registrada y stock actualizado."
      );
      setProducto(null);
      setProveedorNombre("");
      setCodigoProveedor("");
      setNuevo(NUEVO_VACIO);
      setCantidad("1");
      setCostoUnitario("");
      setPrecioVenta("");
      setNumeroFactura("");
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
              onChange={(e) => campoNuevo("nombre", e.target.value)}
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CampoConSugerencias
              id="compraMarcaRepuesto"
              label="Marca del repuesto"
              value={nuevo.marcaRepuesto}
              onChange={(v) => campoNuevo("marcaRepuesto", v)}
              sugerencias={marcasRepuesto}
              required
            />
            <CampoConSugerencias
              id="compraMarcaVehiculo"
              label="Marca del vehículo (opcional)"
              value={nuevo.marcaVehiculo}
              onChange={(v) => campoNuevo("marcaVehiculo", v)}
              sugerencias={marcasVehiculo}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Modelo de vehículo compatible
            </label>
            <input
              value={nuevo.modelo}
              onChange={(e) => campoNuevo("modelo", e.target.value)}
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Año desde
              </label>
              <input
                type="number"
                value={nuevo.anioDesde}
                onChange={(e) => campoNuevo("anioDesde", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Año hasta
              </label>
              <input
                type="number"
                value={nuevo.anioHasta}
                onChange={(e) => campoNuevo("anioHasta", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-marca-azul">
                Categoría
              </label>
              <select
                value={nuevo.categoria}
                onChange={(e) => campoNuevo("categoria", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {nuevo.categoria === "accesorio" ? (
              <div>
                <label className="mb-1 block text-sm font-bold text-marca-azul">
                  Subcategoría
                </label>
                <select
                  value={nuevo.subcategoria}
                  onChange={(e) => campoNuevo("subcategoria", e.target.value)}
                  className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                >
                  {SUBCATEGORIAS_ACCESORIO.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <CampoConSugerencias
                id="compraTipoRepuesto"
                label="Tipo de repuesto"
                value={nuevo.tipoRepuesto}
                onChange={(v) => campoNuevo("tipoRepuesto", v)}
                sugerencias={tiposRepuesto}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Código original (universal)
            </label>
            <input
              value={nuevo.codigoOriginal}
              onChange={(e) => campoNuevo("codigoOriginal", e.target.value)}
              placeholder="Déjalo vacío si aún no lo tienes"
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Glosa técnica (opcional)
            </label>
            <textarea
              value={nuevo.glosaTecnica}
              onChange={(e) => campoNuevo("glosaTecnica", e.target.value)}
              rows={2}
              placeholder="Detalle técnico adicional (medidas, especificaciones, notas...)"
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <CampoConSugerencias
          id="compraProveedor"
          label="¿A quién se le compra?"
          value={proveedorNombre}
          onChange={setProveedorNombre}
          sugerencias={proveedoresSugeridos}
          required
        />
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">
            Código del proveedor
          </label>
          <input
            value={codigoProveedor}
            onChange={(e) => setCodigoProveedor(e.target.value)}
            className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
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
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">
            Precio de venta
          </label>
          <input
            type="number"
            min="0"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value)}
            className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-sm font-bold text-marca-azul">Total</p>
          <p className="text-lg font-black text-marca-azul">{formatoCLP(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t-2 border-marca-azul/20 pt-3">
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">
            N° Factura (opcional)
          </label>
          <input
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            placeholder="Si la dejas vacía, no queda ligada a ninguna factura"
            className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-marca-azul">
            Fecha de la factura
          </label>
          <input
            type="date"
            value={fechaFactura}
            onChange={(e) => setFechaFactura(e.target.value)}
            disabled={!numeroFactura.trim()}
            className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo disabled:opacity-40"
          />
        </div>
      </div>
      {numeroFactura.trim() && (
        <p className="text-sm text-marca-azul/70">
          Si ya existe una factura N° {numeroFactura.trim()} de este proveedor, se le suma este
          producto. Si no existe, se crea una nueva.
        </p>
      )}

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
