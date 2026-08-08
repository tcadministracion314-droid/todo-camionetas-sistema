import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "cambios";

export async function registrarCambio({
  venta,
  itemIndex,
  productoNuevo,
  proveedorNuevoNombre,
  cantidadNueva,
  precioUnitarioNuevo,
  resolucionDiferencia,
  metodoPagoDiferencia,
  clienteId,
  clienteNombre,
  clienteTelefono,
  vendedor,
}) {
  const precioNuevoTotal = precioUnitarioNuevo * cantidadNueva;

  const productoOriginalRef = doc(db, "productos", venta.items[itemIndex].productoId);
  const productoNuevoRef = doc(db, "productos", productoNuevo.id);
  const cambioRef = doc(collection(db, COLECCION));
  const ventaRef = doc(db, "ventas", venta.id);
  const clienteRef = doc(db, "clientes", clienteId);

  await runTransaction(db, async (tx) => {
    const origSnap = await tx.get(productoOriginalRef);
    const nuevoSnap = await tx.get(productoNuevoRef);
    const ventaSnap = await tx.get(ventaRef);
    const clienteSnap = await tx.get(clienteRef);

    if (!origSnap.exists() || !nuevoSnap.exists()) {
      throw new Error("Alguno de los dos productos ya no existe en Inventario.");
    }
    if (!ventaSnap.exists()) throw new Error("La venta ya no existe.");

    const itemsActuales = ventaSnap.data().items || [];
    const itemActual = itemsActuales[itemIndex];
    if (!itemActual || itemActual.estado !== "activo") {
      throw new Error("Ese producto de la venta ya fue devuelto o cambiado.");
    }

    const subtotalVenta = ventaSnap.data().subtotal || 0;
    const descuentoMontoVenta = ventaSnap.data().descuentoMonto || 0;
    const proporcion = subtotalVenta > 0 ? itemActual.subtotal / subtotalVenta : 0;
    const descuentoProrateado = Math.round(descuentoMontoVenta * proporcion);
    const precioDevuelto = Math.max(0, itemActual.subtotal - descuentoProrateado);
    const diferencia = precioNuevoTotal - precioDevuelto;

    const origProveedores = origSnap.data().proveedores || [];
    const origIdx = origProveedores.findIndex((p) => p.nombre === itemActual.proveedorNombre);
    if (origIdx === -1) throw new Error("El proveedor del producto devuelto ya no existe.");
    const origProveedoresNuevos = origProveedores.map((p, i) =>
      i === origIdx ? { ...p, stock: (p.stock || 0) + itemActual.cantidad } : p
    );

    const nuevoProveedores = nuevoSnap.data().proveedores || [];
    const nuevoIdx = nuevoProveedores.findIndex((p) => p.nombre === proveedorNuevoNombre);
    if (nuevoIdx === -1) {
      throw new Error("Ese proveedor no está disponible para el producto nuevo.");
    }
    const stockDisponible = nuevoProveedores[nuevoIdx].stock || 0;
    if (stockDisponible < cantidadNueva) {
      throw new Error(`No hay stock suficiente (quedan ${stockDisponible}).`);
    }
    const nuevoProveedoresActualizados = nuevoProveedores.map((p, i) =>
      i === nuevoIdx ? { ...p, stock: stockDisponible - cantidadNueva } : p
    );

    tx.update(productoOriginalRef, {
      proveedores: origProveedoresNuevos,
      updatedAt: serverTimestamp(),
    });
    tx.update(productoNuevoRef, {
      proveedores: nuevoProveedoresActualizados,
      updatedAt: serverTimestamp(),
    });

    const itemsActualizados = itemsActuales.map((it, i) =>
      i === itemIndex ? { ...it, estado: "cambiado", cambioId: cambioRef.id } : it
    );
    tx.update(ventaRef, { items: itemsActualizados });

    tx.set(cambioRef, {
      ventaId: venta.id,
      itemIndex,
      clienteId,
      clienteNombre,
      clienteTelefono,
      productoDevueltoId: itemActual.productoId,
      productoDevueltoNombre: itemActual.productoNombre,
      proveedorDevuelto: itemActual.proveedorNombre,
      cantidadDevuelta: itemActual.cantidad,
      precioDevuelto,
      productoNuevoId: productoNuevo.id,
      productoNuevoNombre: productoNuevo.nombre,
      proveedorNuevo: proveedorNuevoNombre,
      cantidadNueva,
      precioNuevo: precioNuevoTotal,
      diferencia,
      resolucionDiferencia,
      metodoPagoDiferencia: metodoPagoDiferencia || null,
      vendedorId: vendedor.uid,
      vendedorEmail: vendedor.email,
      fecha: serverTimestamp(),
    });

    if (resolucionDiferencia === "saldoAFavor" && diferencia < 0) {
      const monto = Math.abs(diferencia);
      const saldoActual = clienteSnap.data()?.saldoAFavor || 0;
      const movimientos = clienteSnap.data()?.movimientosSaldo || [];
      tx.update(clienteRef, {
        saldoAFavor: saldoActual + monto,
        movimientosSaldo: [
          ...movimientos,
          {
            monto,
            motivo: "Cambio de producto",
            referenciaId: cambioRef.id,
            fecha: new Date().toISOString(),
          },
        ],
      });
    }
  });
}
