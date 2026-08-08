import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const COLECCION = "devoluciones";

export async function registrarDevolucion({
  venta,
  motivo,
  metodoPagoDevolucion,
  clienteId,
  clienteNombre,
  clienteTelefono,
  vendedor,
}) {
  const productoRef = doc(db, "productos", venta.productoId);
  const ventaRef = doc(db, "ventas", venta.id);
  const devolucionRef = doc(collection(db, COLECCION));
  const clienteRef = doc(db, "clientes", clienteId);

  await runTransaction(db, async (tx) => {
    const prodSnap = await tx.get(productoRef);
    if (!prodSnap.exists()) throw new Error("El producto ya no existe en Inventario.");
    const clienteSnap = await tx.get(clienteRef);

    const proveedores = prodSnap.data().proveedores || [];
    const idx = proveedores.findIndex((p) => p.nombre === venta.proveedorNombre);
    if (idx === -1) {
      throw new Error("Ese proveedor ya no existe para este producto.");
    }
    const nuevosProveedores = proveedores.map((p, i) =>
      i === idx ? { ...p, stock: (p.stock || 0) + venta.cantidad } : p
    );
    tx.update(productoRef, { proveedores: nuevosProveedores, updatedAt: serverTimestamp() });

    tx.update(ventaRef, { estado: "anulada", anuladaEn: serverTimestamp() });

    tx.set(devolucionRef, {
      ventaId: venta.id,
      productoId: venta.productoId,
      productoNombre: venta.productoNombre,
      proveedorNombre: venta.proveedorNombre,
      cantidad: venta.cantidad,
      montoDevuelto: venta.total,
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
        saldoAFavor: saldoActual + venta.total,
        movimientosSaldo: [
          ...movimientos,
          {
            monto: venta.total,
            motivo: "Devolución sin reembolso",
            referenciaId: devolucionRef.id,
            fecha: new Date().toISOString(),
          },
        ],
      });
    }
  });
}
