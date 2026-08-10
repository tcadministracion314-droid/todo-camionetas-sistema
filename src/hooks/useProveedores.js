import { useEffect, useState } from "react";
import { subscribeCatalogo } from "../lib/firestore/catalogo";

export function useProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeCatalogo("proveedores", (items) => {
      setProveedores(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { proveedores, loading };
}
