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
  marcaRepuesto: "",
  marcaVehiculo: "",
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
  proveedores: [{ nombre: "", codigo: "" }],
  codigoOriginal: "",
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
          proveedores:
            producto.proveedores?.length > 0
              ? producto.proveedores.map((p) => ({
                  nombre: p.nombre || "",
                  codigo: p.codigo || "",
                }))
              : [{ nombre: "", codigo: "" }],
          codigoOriginal: producto.codigoOriginal || "",
        }
      : FORM_VACIO
  );
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const { valores: marcasRepuesto } = useCatalogo("marcasRepuesto");
  const { valores: marcasVehiculo } = useCatalogo("marcasVehiculo");
  const { valores: tiposRepuesto } = useCatalogo("tiposRepuesto");
  const { valores: proveedoresSugeridos } = useCatalogo("proveedores");

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarProveedor(index, campo, valor) {
    setForm((prev) => ({
      ...prev,
      proveedores: prev.proveedores.map((p, i) =>
        i === index ? { ...p, [campo]: valor } : p
      ),
    }));
  }

  function agregarProveedor() {
    setForm((prev) => ({
      ...prev,
      proveedores: [...prev.proveedores, { nombre: "", codigo: "" }],
    }));
  }

  function quitarProveedor(index) {
    setForm((prev) => ({
      ...prev,
      proveedores: prev.proveedores.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const hayProveedor = form.proveedores.some((p) => p.nombre.trim());
    if (!hayProveedor) {
      setError("Debes ingresar al menos un proveedor.");
      return;
    }

    setGuardando(true);

    let fotoUrl = form.fotoUrl;
    let avisoFoto = "";
    if (archivoFoto) {
      try {
        fotoUrl = await subirFotoProducto(archivoFoto);
      } catch (err) {
        console.error(err);
        avisoFoto =
          "No se pudo subir la foto (revisa que Storage esté activado en Firebase). El resto del producto se guardará igual.";
      }
    }

    try {
      const datos = { ...form, fotoUrl };

      if (esEdicion) {
        await actualizarProducto(producto.id, datos);
      } else {
        await crearProducto(datos);
      }
      if (avisoFoto) window.alert(avisoFoto);
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
              id="marcaRepuesto"
              label="Marca del repuesto (fabricante, ej. Bosch)"
              value={form.marcaRepuesto}
              onChange={(v) => actualizarCampo("marcaRepuesto", v)}
              sugerencias={marcasRepuesto}
              required
            />
            <CampoConSugerencias
              id="marcaVehiculo"
              label="Marca del vehículo compatible (opcional)"
              value={form.marcaVehiculo}
              onChange={(v) => actualizarCampo("marcaVehiculo", v)}
              sugerencias={marcasVehiculo}
            />
          </div>

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
              htmlFor="codigoOriginal"
              className="mb-1 block text-sm font-bold text-marca-azul"
            >
              Código original (universal, el mismo para todos los proveedores)
            </label>
            <input
              id="codigoOriginal"
              value={form.codigoOriginal}
              onChange={(e) =>
                actualizarCampo("codigoOriginal", e.target.value)
              }
              placeholder="Déjalo vacío si aún no lo tienes"
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="block text-sm font-bold text-marca-azul">
                Proveedores (al menos uno, cada uno con su propio código)
              </span>
              <button
                type="button"
                onClick={agregarProveedor}
                className="text-sm font-bold text-marca-rojo hover:underline"
              >
                + Agregar proveedor
              </button>
            </div>

            <div className="space-y-2">
              {form.proveedores.map((p, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1">
                    <CampoConSugerencias
                      id={`proveedor-${index}`}
                      label={index === 0 ? "Proveedor" : ""}
                      value={p.nombre}
                      onChange={(v) => actualizarProveedor(index, "nombre", v)}
                      sugerencias={proveedoresSugeridos}
                    />
                  </div>
                  <div className="flex-1">
                    {index === 0 && (
                      <label className="mb-1 block text-sm font-bold text-marca-azul">
                        Código del proveedor
                      </label>
                    )}
                    <input
                      value={p.codigo}
                      onChange={(e) =>
                        actualizarProveedor(index, "codigo", e.target.value)
                      }
                      className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
                    />
                  </div>
                  {form.proveedores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarProveedor(index)}
                      className="px-2 py-2 font-bold text-marca-rojo"
                      aria-label="Quitar proveedor"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
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
