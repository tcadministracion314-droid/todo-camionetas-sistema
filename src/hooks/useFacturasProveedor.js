import { useEffect, useState } from "react";
import { subscribeFacturasProveedor } from "../lib/firestore/facturasProveedor";

export function useFacturasProveedor() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeFacturasProveedor((items) => {
      setFacturas(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { facturas, loading };
}
