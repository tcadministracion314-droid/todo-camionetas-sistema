export function totalActivoVenta(venta) {
  const devuelto = (venta.items || [])
    .filter((it) => it.estado === "anulado")
    .reduce((acc, it) => acc + (it.montoDevuelto || 0), 0);
  return Math.max(0, (venta.total || 0) - devuelto);
}
