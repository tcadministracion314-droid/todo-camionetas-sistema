import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "devoluciones";

export async function registrarDevolucion({
  venta,
  itemIndex,
  motivo,
  metodoPagoDevolucion,
  clienteId,
  clienteNombre,
  clienteTelefono,
  vendedor,
}) {
  const item = venta.items[itemIndex];
  const productoRef = doc(db, "productos", item.productoId);
  const ventaRef = doc(db, "ventas", venta.id);
  const devolucionRef = doc(collection(db, COLECCION));
  const clienteRef = doc(db, "clientes", clienteId);

  await runTransaction(db, async (tx) => {
    const prodSnap = await tx.get(productoRef);
    if (!prodSnap.exists()) throw new Error("El producto ya no existe en Inventario.");
    const ventaSnap = await tx.get(ventaRef);
    if (!ventaSnap.exists()) throw new Error("La venta ya no existe.");
    const clienteSnap = await tx.get(clienteRef);

    const itemsActuales = ventaSnap.data().items || [];
    const itemActual = itemsActuales[itemIndex];
    if (!itemActual || itemActual.estado !== "activo") {
      throw new Error("Ese producto de la venta ya fue devuelto o cambiado.");
    }

    const proveedores = prodSnap.data().proveedores || [];
    const idx = proveedores.findIndex((p) => p.nombre === itemActual.proveedorNombre);
    if (idx === -1) throw new Error("Ese proveedor ya no existe para este producto.");
    const nuevosProveedores = proveedores.map((p, i) =>
      i === idx ? { ...p, stock: (p.stock || 0) + itemActual.cantidad } : p
    );
    tx.update(productoRef, { proveedores: nuevosProveedores, updatedAt: serverTimestamp() });

    const subtotalVenta = ventaSnap.data().subtotal || 0;
    const descuentoMontoVenta = ventaSnap.data().descuentoMonto || 0;
    const proporcion = subtotalVenta > 0 ? itemActual.subtotal / subtotalVenta : 0;
    const descuentoProrateado = Math.round(descuentoMontoVenta * proporcion);
    const montoDevuelto = Math.max(0, itemActual.subtotal - descuentoProrateado);

    const itemsActualizados = itemsActuales.map((it, i) =>
      i === itemIndex ? { ...it, estado: "anulado", montoDevuelto } : it
    );
    tx.update(ventaRef, { items: itemsActualizados });

    tx.set(devolucionRef, {
      ventaId: venta.id,
      itemIndex,
      productoId: itemActual.productoId,
      productoNombre: itemActual.productoNombre,
      proveedorNombre: itemActual.proveedorNombre,
      cantidad: itemActual.cantidad,
      montoDevuelto,
      motivo,
      metodoPagoDevolucion: motivo === "reembolso" ? metodoPagoDevolucion : null,
      clienteId,
      clienteNombre,
      clienteTelefono,
      vendedorId: vendedor.uid,
      vendedorEmail: vendedor.email,
      fecha: serverTimestamp(),
    });

    if (motivo === "saldoAFavor") {
      const saldoActual = clienteSnap.data()?.saldoAFavor || 0;
      const movimientos = clienteSnap.data()?.movimientosSaldo || [];
      tx.update(clienteRef, {
        saldoAFavor: saldoActual + montoDevuelto,
        movimientosSaldo: [
          ...movimientos,
          {
            monto: montoDevuelto,
            motivo: "Devolución sin reembolso",
            referenciaId: devolucionRef.id,
            fecha: new Date().toISOString(),
          },
        ],
      });
    }
  });
}
