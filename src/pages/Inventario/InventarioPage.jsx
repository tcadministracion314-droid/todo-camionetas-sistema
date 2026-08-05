import { useMemo, useState } from "react";
import { useProductos } from "../../hooks/useProductos";
import { eliminarProducto } from "../../lib/firestore/productos";
import { TIPOS_INVENTARIO } from "../../lib/constants";
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

export default function InventarioPage() {
  const { productos, loading } = useProductos();
  const [tab, setTab] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [anioFiltro, setAnioFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const anio = anioFiltro ? Number(anioFiltro) : null;

    return productos.filter((p) => {
      if (tab !== "todos" && p.tipoInventario !== tab) return false;

      if (texto) {
        const coincide =
          p.nombre?.toLowerCase().includes(texto) ||
          p.marca?.toLowerCase().includes(texto) ||
          p.modelo?.toLowerCase().includes(texto) ||
          p.proveedores?.some((prov) =>
            prov.nombre?.toLowerCase().includes(texto)
          );
        if (!coincide) return false;
      }

      if (anio) {
        const dentroDeRango =
          (p.anioDesde === null || p.anioDesde <= anio) &&
          (p.anioHasta === null || p.anioHasta >= anio);
        if (!dentroDeRango) return false;
      }

      return true;
    });
  }, [productos, tab, busqueda, anioFiltro]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(productosFiltrados.length / POR_PAGINA)
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const productosPagina = productosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase text-marca-azul">
          Inventario
        </h1>
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

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cambiarFiltro(setTab)("todos")}
          className={`px-4 py-2 text-sm font-bold uppercase ${
            tab === "todos"
              ? "bg-marca-azul text-white"
              : "bg-marca-azul/10 text-marca-azul"
          }`}
        >
          Todos
        </button>
        {TIPOS_INVENTARIO.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => cambiarFiltro(setTab)(t.value)}
            className={`px-4 py-2 text-sm font-bold uppercase ${
              tab === t.value
                ? "bg-marca-azul text-white"
                : "bg-marca-azul/10 text-marca-azul"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-4">
        <input
          value={busqueda}
          onChange={(e) => cambiarFiltro(setBusqueda)(e.target.value)}
          placeholder="Buscar por nombre, marca, modelo o proveedor..."
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

      {loading ? (
        <p className="font-bold text-marca-azul">Cargando inventario...</p>
      ) : (
        <div className="overflow-x-auto border-2 border-marca-azul">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-marca-azul text-white">
                <th className="p-3">Foto</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Marca</th>
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
              {productosPagina.map((p) => (
                <tr key={p.id} className="border-t border-marca-azul/20">
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
                  <td className="p-3">{p.marca}</td>
                  <td className="p-3">{p.modelo || "—"}</td>
                  <td className="p-3">
                    {p.anioDesde || p.anioHasta
                      ? `${p.anioDesde ?? "?"}–${p.anioHasta ?? "?"}`
                      : "—"}
                  </td>
                  <td className="p-3 text-sm">{textoProveedores(p.proveedores)}</td>
                  <td className="p-3">{p.stock ?? "—"}</td>
                  <td className="p-3">{formatoCLP(p.precioCosto)}</td>
                  <td className="p-3">{formatoCLP(p.precioVenta)}</td>
                  <td className="p-3 text-xs font-bold uppercase text-marca-azul">
                    {TIPOS_INVENTARIO.find((t) => t.value === p.tipoInventario)
                      ?.label ?? p.tipoInventario}
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
              ))}
              {productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-marca-azul">
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && productosFiltrados.length > POR_PAGINA && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-bold text-marca-azul">
            {productosFiltrados.length} productos — página {paginaActual} de{" "}
            {totalPaginas}
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
