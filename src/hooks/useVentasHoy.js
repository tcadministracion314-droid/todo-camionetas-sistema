import { useEffect, useMemo, useState } from "react";
import { subscribeVentasVendedor } from "../lib/firestore/ventas";

function esDeHoy(fecha) {
  if (!fecha?.toDate) return false;
  const d = fecha.toDate();
  const hoy = new Date();
  return (
    d.getFullYear() === hoy.getFullYear() &&
    d.getMonth() === hoy.getMonth() &&
    d.getDate() === hoy.getDate()
  );
}

export function useVentasHoy(vendedorId) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendedorId) return undefined;
    const unsubscribe = subscribeVentasVendedor(vendedorId, (items) => {
      setVentas(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [vendedorId]);

  const ventasHoy = useMemo(() => {
    return ventas
      .filter((v) => esDeHoy(v.fecha))
      .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0));
  }, [ventas]);

  return { ventasHoy, loading };
}
