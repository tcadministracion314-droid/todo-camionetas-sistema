import { Fragment, useMemo, useState } from "react";
import { useProductos } from "../../hooks/useProductos";
import { eliminarProducto } from "../../lib/firestore/productos";
import { TIPOS_INVENTARIO } from "../../lib/constants";
import { exportarProductosAExcel } from "../../lib/exportarExcel";
import ProductoFormModal from "./ProductoFormModal";

const POR_PAGINA = 50;

function formatoCLP(numero) {
  if (numero === null || numero === undefined) return "—";
  return numero.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });
}

function textoProveedores(proveedores) {
  if (!proveedores || proveedores.length === 0) return "—";
  const [primero, ...resto] = proveedores;
  const base = primero.codigo ? `${primero.nombre} (${primero.codigo})` : primero.nombre;
  return resto.length > 0 ? `${base} +${resto.length} más` : base;
}

function stockTotal(proveedores) {
  if (!proveedores || proveedores.length === 0) return null;
  const valores = proveedores.map((p) => p.stock).filter((v) => v !== null && v !== undefined);
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0);
}

function rangoPrecio(proveedores, campo) {
  if (!proveedores || proveedores.length === 0) return "—";
  const valores = proveedores.map((p) => p[campo]).filter((v) => v !== null && v !== undefined);
  if (valores.length === 0) return "—";
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return min === max ? formatoCLP(min) : `${formatoCLP(min)} – ${formatoCLP(max)}`;
}

const SIN_MARCA = "__sin_marca__";

function normalizarPalabra(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-–]/g, "");
}

function modeloGenerico(modelo) {
  if (!modelo) return null;
  const limpio = modelo.replace(/[-–]/g, "").trim();
  return limpio.split(/\s+/)[0] || null;
}

function coincideTexto(p, texto) {
  if (!texto) return true;
  return (
    p.nombre?.toLowerCase().includes(texto) ||
    p.marcaRepuesto?.toLowerCase().includes(texto) ||
    p.marcaVehiculo?.toLowerCase().includes(texto) ||
    p.modelo?.toLowerCase().includes(texto) ||
    p.codigoOriginal?.toLowerCase().includes(texto) ||
    p.proveedores?.some(
      (prov) =>
        prov.nombre?.toLowerCase().includes(texto) ||
        prov.codigo?.toLowerCase().includes(texto)
    )
  );
}

function TablaProductos({
  lista,
  loading,
  expandidos,
  alternarExpandido,
  setFotoAmpliada,
  setProductoEditando,
  setModalAbierto,
  handleEliminar,
  pagina,
  setPagina,
}) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const itemsPagina = lista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  if (loading) {
    return <p className="font-bold text-marca-azul">Cargando inventario...</p>;
  }

  return (
    <>
      <div className="overflow-x-auto border-2 border-marca-azul">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-marca-azul text-white">
              <th className="p-3"></th>
              <th className="p-3">Foto</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Marca repuesto</th>
              <th className="p-3">Marca vehículo</th>
              <th className="p-3">Modelo</th>
              <th className="p-3">Año</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Costo</th>
              <th className="p-3">Venta</th>
              <th className="p-3">Tipo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {itemsPagina.map((p) => {
              const proveedores = p.proveedores || [];
              const multiple = proveedores.length > 1;
              const expandido = expandidos.has(p.id);
              return (
                <Fragment key={p.id}>
                  <tr className="border-t border-marca-azul/20">
                    <td className="p-3">
                      {multiple && (
                        <button
                          type="button"
                          onClick={() => alternarExpandido(p.id)}
                          className="font-bold text-marca-azul"
                          aria-label="Ver proveedores"
                        >
                          {expandido ? "▼" : "▶"}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {p.fotoUrl ? (
                        <button
                          type="button"
                          onClick={() => setFotoAmpliada(p.fotoUrl)}
                          className="text-sm font-bold text-marca-azul hover:underline"
                        >
                          Ver foto
                        </button>
                      ) : (
                        <span className="text-sm text-marca-azul/40">—</span>
                      )}
                    </td>
                    <td className="p-3 font-bold">{p.nombre}</td>
                    <td className="p-3">{p.marcaRepuesto}</td>
                    <td className="p-3">{p.marcaVehiculo || "—"}</td>
                    <td className="p-3">{p.modelo || "—"}</td>
                    <td className="p-3">
                      {p.anioDesde || p.anioHasta
                        ? `${p.anioDesde ?? "?"}–${p.anioHasta ?? "?"}`
                        : "—"}
                    </td>
                    <td className="p-3 text-sm">
                      {multiple
                        ? `${proveedores.length} proveedores`
                        : textoProveedores(proveedores)}
                    </td>
                    <td className="p-3">{stockTotal(proveedores) ?? "—"}</td>
                    <td className="p-3">{rangoPrecio(proveedores, "costo")}</td>
                    <td className="p-3">{rangoPrecio(proveedores, "venta")}</td>
                    <td className="p-3 text-xs font-bold uppercase text-marca-azul">
                      {TIPOS_INVENTARIO.find((t) => t.value === p.tipoInventario)?.label ??
                        p.tipoInventario}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProductoEditando(p);
                            setModalAbierto(true);
                          }}
                          className="text-sm font-bold text-marca-azul hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(p)}
                          className="text-sm font-bold text-marca-rojo hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {multiple &&
                    expandido &&
                    proveedores.map((prov, i) => (
                      <tr
                        key={`${p.id}-prov-${i}`}
                        className="border-t border-marca-azul/10 bg-marca-azul/5"
                      >
                        <td className="p-2"></td>
                        <td className="p-2"></td>
                        <td className="p-2 pl-6 text-sm text-marca-azul/70" colSpan={2}>
                          ↳ {prov.nombre}
                          {prov.codigo ? ` (${prov.codigo})` : ""}
                        </td>
                        <td className="p-2 text-sm text-marca-azul/70" colSpan={2}>
                          {prov.fecha?.toDate
                            ? prov.fecha.toDate().toLocaleDateString("es-CL")
                            : "—"}
                        </td>
                        <td className="p-2"></td>
                        <td className="p-2"></td>
                        <td className="p-2 text-sm">{prov.stock ?? "—"}</td>
                        <td className="p-2 text-sm">{formatoCLP(prov.costo)}</td>
                        <td className="p-2 text-sm">{formatoCLP(prov.venta)}</td>
                        <td className="p-2"></td>
                        <td className="p-2"></td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={13} className="p-6 text-center text-marca-azul">
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lista.length > POR_PAGINA && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-bold text-marca-azul">
            {lista.length} productos — página {paginaActual} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={paginaActual === 1}
              onClick={() => setPagina((p) => p - 1)}
              className="bg-marca-azul px-4 py-1.5 text-sm font-bold uppercase text-white disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="bg-marca-azul px-4 py-1.5 text-sm font-bold uppercase text-white disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function InventarioPage() {
  const { productos, loading } = useProductos();
  const [busquedaGeneral, setBusquedaGeneral] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [anioFiltro, setAnioFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [expandidos, setExpandidos] = useState(new Set());
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [marcaVehiculoFiltro, setMarcaVehiculoFiltro] = useState(null);
  const [modeloFiltro, setModeloFiltro] = useState(null);

  function elegirCategoria(valor) {
    setCategoriaFiltro(valor);
    setMarcaVehiculoFiltro(null);
    setModeloFiltro(null);
    setBusqueda("");
    setAnioFiltro("");
    setPagina(1);
  }

  function elegirMarcaVehiculo(valor) {
    setMarcaVehiculoFiltro(valor);
    setModeloFiltro(null);
    setPagina(1);
  }

  function elegirModelo(valor) {
    setModeloFiltro(valor);
    setPagina(1);
  }

  const productosValidos = useMemo(
    () => productos.filter((p) => p.tipoInventario !== "pieza_unica_encargada"),
    [productos]
  );

  const resultadosBusquedaGeneral = useMemo(() => {
    const texto = busquedaGeneral.trim().toLowerCase();
    if (!texto) return [];
    return productosValidos.filter((p) => coincideTexto(p, texto));
  }, [productosValidos, busquedaGeneral]);

  const marcasVehiculoDisponibles = useMemo(() => {
    const set = new Set();
    let hayProductosSinMarca = false;
    productosValidos.forEach((p) => {
      if (p.categoria !== "repuesto") return;
      if (p.marcaVehiculo) set.add(p.marcaVehiculo);
      else hayProductosSinMarca = true;
    });
    const marcas = [...set].sort();
    if (hayProductosSinMarca) marcas.push(SIN_MARCA);
    return marcas;
  }, [productosValidos]);

  const modelosGenericosDisponibles = useMemo(() => {
    if (!marcaVehiculoFiltro) return [];
    const conteoPorClave = new Map();
    productosValidos.forEach((p) => {
      if (p.categoria !== "repuesto") return;
      const marcaProducto = p.marcaVehiculo || SIN_MARCA;
      if (marcaProducto !== marcaVehiculoFiltro) return;
      const generico = modeloGenerico(p.modelo);
      if (!generico) return;
      const clave = normalizarPalabra(generico);
      if (!conteoPorClave.has(clave)) conteoPorClave.set(clave, new Map());
      const displays = conteoPorClave.get(clave);
      displays.set(generico, (displays.get(generico) || 0) + 1);
    });

    const resultado = [];
    conteoPorClave.forEach((displays, clave) => {
      const mejor = [...displays.entries()].sort((a, b) => b[1] - a[1])[0][0];
      resultado.push({ clave, label: mejor });
    });
    return resultado.sort((a, b) => a.label.localeCompare(b.label));
  }, [productosValidos, marcaVehiculoFiltro]);

  function alternarExpandido(id) {
    setExpandidos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  const productosFiltrados = useMemo(() => {
    if (!categoriaFiltro) return [];
    if (categoriaFiltro === "repuesto" && (!marcaVehiculoFiltro || !modeloFiltro)) return [];
    const texto = busqueda.trim().toLowerCase();
    const anio = anioFiltro ? Number(anioFiltro) : null;

    return productosValidos.filter((p) => {
      if (p.categoria !== categoriaFiltro) return false;

      if (categoriaFiltro === "repuesto") {
        const marcaProducto = p.marcaVehiculo || SIN_MARCA;
        if (marcaProducto !== marcaVehiculoFiltro) return false;
        if (normalizarPalabra(modeloGenerico(p.modelo)) !== modeloFiltro) return false;
      }

      if (!coincideTexto(p, texto)) return false;

      if (anio) {
        const dentroDeRango =
          (p.anioDesde === null || p.anioDesde <= anio) &&
          (p.anioHasta === null || p.anioHasta >= anio);
        if (!dentroDeRango) return false;
      }

      return true;
    });
  }, [
    productosValidos,
    categoriaFiltro,
    busqueda,
    anioFiltro,
    marcaVehiculoFiltro,
    modeloFiltro,
  ]);

  function cambiarFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  async function handleEliminar(producto) {
    const confirmar = window.confirm(
      `¿Eliminar "${producto.nombre}" del inventario? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;
    await eliminarProducto(producto.id, producto.fotoUrl);
  }

  const tablaProps = {
    loading,
    expandidos,
    alternarExpandido,
    setFotoAmpliada,
    setProductoEditando,
    setModalAbierto,
    handleEliminar,
    pagina,
    setPagina,
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase text-marca-azul">
          Inventario
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={productos.length === 0}
            onClick={() => exportarProductosAExcel(productos)}
            className="border-2 border-marca-azul px-5 py-2 font-black uppercase text-marca-azul hover:bg-marca-azul/10 disabled:opacity-30"
          >
            Exportar a Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setProductoEditando(null);
              setModalAbierto(true);
            }}
            className="bg-marca-rojo px-5 py-2 font-black uppercase text-white hover:opacity-90"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {!categoriaFiltro ? (
        <div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-bold text-marca-azul">
              Buscar en todo el inventario
            </label>
            <input
              value={busquedaGeneral}
              onChange={(e) => cambiarFiltro(setBusquedaGeneral)(e.target.value)}
              placeholder="Nombre, marca de repuesto, marca de vehículo, modelo, proveedor, código del proveedor o código original..."
              className="w-full border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>

          {busquedaGeneral.trim() ? (
            <div>
              <button
                type="button"
                onClick={() => cambiarFiltro(setBusquedaGeneral)("")}
                className="mb-3 text-sm font-bold text-marca-azul hover:underline"
              >
                ✕ Limpiar búsqueda
              </button>
              <TablaProductos lista={resultadosBusquedaGeneral} {...tablaProps} />
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => elegirCategoria("repuesto")}
                className="flex-1 border-4 border-marca-rojo bg-marca-rojo/5 py-8 text-xl font-black uppercase text-marca-rojo hover:bg-marca-rojo/10"
              >
                Repuestos
              </button>
              <button
                type="button"
                onClick={() => elegirCategoria("accesorio")}
                className="flex-1 border-4 border-marca-rojo bg-marca-rojo/5 py-8 text-xl font-black uppercase text-marca-rojo hover:bg-marca-rojo/10"
              >
                Accesorios
              </button>
            </div>
          )}
        </div>
      ) : categoriaFiltro === "repuesto" && !marcaVehiculoFiltro ? (
        <div>
          <button
            type="button"
            onClick={() => elegirCategoria(null)}
            className="mb-3 text-sm font-bold text-marca-azul hover:underline"
          >
            ← Cambiar categoría
          </button>
          <p className="mb-2 text-sm font-black uppercase text-marca-azul">
            Elige la marca del vehículo
          </p>
          <div className="flex flex-wrap gap-2">
            {marcasVehiculoDisponibles.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => elegirMarcaVehiculo(m)}
                className="border-2 border-marca-azul px-4 py-2 text-sm font-bold uppercase text-marca-azul hover:bg-marca-azul/10"
              >
                {m === SIN_MARCA ? "Sin marca" : m}
              </button>
            ))}
          </div>
        </div>
      ) : categoriaFiltro === "repuesto" && !modeloFiltro ? (
        <div>
          <button
            type="button"
            onClick={() => elegirMarcaVehiculo(null)}
            className="mb-3 text-sm font-bold text-marca-azul hover:underline"
          >
            ← Cambiar marca ({marcaVehiculoFiltro === SIN_MARCA ? "Sin marca" : marcaVehiculoFiltro})
          </button>
          <p className="mb-2 text-sm font-black uppercase text-marca-azul">
            Elige el modelo
          </p>
          <div className="flex flex-wrap gap-2">
            {modelosGenericosDisponibles.map((m) => (
              <button
                key={m.clave}
                type="button"
                onClick={() => elegirModelo(m.clave)}
                className="border-2 border-marca-azul px-4 py-2 text-sm font-bold uppercase text-marca-azul hover:bg-marca-azul/10"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => elegirCategoria(null)}
            className="mb-3 text-sm font-bold text-marca-azul hover:underline"
          >
            ← Cambiar categoría
            {categoriaFiltro === "repuesto" &&
              ` (${marcaVehiculoFiltro === SIN_MARCA ? "Sin marca" : marcaVehiculoFiltro} — ${
                modelosGenericosDisponibles.find((m) => m.clave === modeloFiltro)?.label ??
                modeloFiltro
              })`}
          </button>

          {categoriaFiltro === "repuesto" && (
            <button
              type="button"
              onClick={() => elegirModelo(null)}
              className="mb-3 ml-4 text-sm font-bold text-marca-azul hover:underline"
            >
              ← Cambiar modelo
            </button>
          )}

          <div className="mb-4 flex gap-4">
            <input
              value={busqueda}
              onChange={(e) => cambiarFiltro(setBusqueda)(e.target.value)}
              placeholder="Buscar por nombre, marca, modelo, proveedor, código del proveedor o código original..."
              className="flex-1 border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
            <input
              value={anioFiltro}
              onChange={(e) => cambiarFiltro(setAnioFiltro)(e.target.value)}
              type="number"
              placeholder="Año"
              className="w-32 border-2 border-marca-azul px-3 py-2 outline-none focus:border-marca-rojo"
            />
          </div>

          <TablaProductos lista={productosFiltrados} {...tablaProps} />
        </>
      )}

      {modalAbierto && (
        <ProductoFormModal
          producto={productoEditando}
          onClose={() => setModalAbierto(false)}
        />
      )}

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <img
            src={fotoAmpliada}
            alt=""
            className="max-h-[85vh] max-w-full border-4 border-white"
          />
        </div>
      )}
    </div>
  );
}
