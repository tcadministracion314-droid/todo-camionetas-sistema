import { useState } from "react";
import CampoConSugerencias from "../../components/CampoConSugerencias";
import { useCatalogo } from "../../hooks/useCatalogo";
import {
  CATEGORIAS,
  SUBCATEGORIAS_ACCESORIO,
  TIPOS_INVENTARIO,
} from "../../lib/constants";
import {
  crearProducto,
  actualizarProducto,
  subirFotoProducto,
} from "../../lib/firestore/productos";

function fechaAInputValue(fecha) {
  if (!fecha) return "";
  const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
  return date.toISOString().slice(0, 10);
}

const FORM_VACIO = {
  nombre: "",
  marca: "",
  categoria: "repuesto",
  subcategoria: SUBCATEGORIAS_ACCESORIO[0],
  tipoRepuesto: "",
  modelo: "",
  anioDesde: "",
  anioHasta: "",
  stock: "",
  precioCosto: "",
  precioVenta: "",
  fechaIngreso: new Date().toISOString().slice(0, 10),
  tipoInventario: "en_bodega",
  proveedor: "",
  fotoUrl: "",
};

export default function ProductoFormModal({ producto, onClose }) {
  const esEdicion = Boolean(producto);
  const [form, setForm] = useState(
    esEdicion
      ? {
          ...FORM_VACIO,
          ...producto,
          anioDesde: producto.anioDesde ?? "",
          anioHasta: producto.anioHasta ?? "",
          stock: producto.stock ?? "",
          precioCosto: producto.precioCosto ?? "",
          precioVenta: producto.precioVenta ?? "",
          fechaIngreso: fechaAInputValue(producto.fechaIngreso),
          subcategoria: producto.subcategoria || SUBCATEGORIAS_ACCESORIO[0],
        }
      : FORM_VACIO
  );
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const { valores: marcas } = useCatalogo("marcas");
  const { valores: tiposRepuesto } = useCatalogo("tiposRepuesto");

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      let fotoUrl = form.fotoUrl;
      if (archivoFoto) {
        fotoUrl = await subirFotoProducto(archivoFoto);
      }
      const datos = { ...form, fotoUrl };

      if (esEdicion) {
        await actualizarProducto(producto.id, datos);
      } else {
        await crearProducto(datos);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el producto. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-4 border-marca-rojo bg-white p-6">
        <h2 className="mb-4 text-xl font-black uppercase text-marca-azul">
          {esEdicion ? "Editar producto" : "Nuevo producto"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nombre"
              className="mb-1 block text-sm font-bold text-marca-azul"
            >
              Nombre del artículo
            </label>
            <input
              id="nombre"
              required
              value={form.nombre}
              onChange={(e) => actualizarCampo("nombre", e.target.value)}
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CampoConSugerencias
              id="marca"
              label="Marca"
              value={form.marca}
              onChange={(v) => actualizarCampo("marca", v)}
              sugerencias={marcas}
              required
            />
            <div>
              <label
                htmlFor="modelo"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Modelo de vehículo compatible
              </label>
              <input
                id="modelo"
                value={form.modelo}
                onChange={(e) => actualizarCampo("modelo", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="anioDesde"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Año desde
              </label>
              <input
                id="anioDesde"
                type="number"
                value={form.anioDesde}
                onChange={(e) => actualizarCampo("anioDesde", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div>
              <label
                htmlFor="anioHasta"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Año hasta
              </label>
              <input
                id="anioHasta"
                type="number"
                value={form.anioHasta}
                onChange={(e) => actualizarCampo("anioHasta", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="categoria"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Categoría
              </label>
              <select
                id="categoria"
                value={form.categoria}
                onChange={(e) => actualizarCampo("categoria", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {form.categoria === "accesorio" ? (
              <div>
                <label
                  htmlFor="subcategoria"
                  className="mb-1 block text-sm font-bold text-marca-azul"
                >
                  Subcategoría
                </label>
                <select
                  id="subcategoria"
                  value={form.subcategoria}
                  onChange={(e) =>
                    actualizarCampo("subcategoria", e.target.value)
                  }
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
                id="tipoRepuesto"
                label="Tipo de repuesto"
                value={form.tipoRepuesto}
                onChange={(v) => actualizarCampo("tipoRepuesto", v)}
                sugerencias={tiposRepuesto}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="stock"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Stock
              </label>
              <input
                id="stock"
                type="number"
                value={form.stock}
                onChange={(e) => actualizarCampo("stock", e.target.value)}
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div>
              <label
                htmlFor="precioCosto"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Precio costo
              </label>
              <input
                id="precioCosto"
                type="number"
                value={form.precioCosto}
                onChange={(e) =>
                  actualizarCampo("precioCosto", e.target.value)
                }
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div>
              <label
                htmlFor="precioVenta"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Precio venta
              </label>
              <input
                id="precioVenta"
                type="number"
                value={form.precioVenta}
                onChange={(e) =>
                  actualizarCampo("precioVenta", e.target.value)
                }
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="fechaIngreso"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Fecha de ingreso
              </label>
              <input
                id="fechaIngreso"
                type="date"
                value={form.fechaIngreso}
                onChange={(e) =>
                  actualizarCampo("fechaIngreso", e.target.value)
                }
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              />
            </div>
            <div>
              <label
                htmlFor="tipoInventario"
                className="mb-1 block text-sm font-bold text-marca-azul"
              >
                Tipo de inventario
              </label>
              <select
                id="tipoInventario"
                value={form.tipoInventario}
                onChange={(e) =>
                  actualizarCampo("tipoInventario", e.target.value)
                }
                className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
              >
                {TIPOS_INVENTARIO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="proveedor"
              className="mb-1 block text-sm font-bold text-marca-azul"
            >
              Proveedor (opcional)
            </label>
            <input
              id="proveedor"
              value={form.proveedor}
              onChange={(e) => actualizarCampo("proveedor", e.target.value)}
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>

          <div>
            <label
              htmlFor="foto"
              className="mb-1 block text-sm font-bold text-marca-azul"
            >
              Foto
            </label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              onChange={(e) => setArchivoFoto(e.target.files?.[0] || null)}
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
            {form.fotoUrl && !archivoFoto && (
              <img
                src={form.fotoUrl}
                alt=""
                className="mt-2 h-20 w-20 object-cover"
              />
            )}
          </div>

          {error && (
            <p className="font-bold text-marca-rojo">{error}</p>
          )}

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
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
