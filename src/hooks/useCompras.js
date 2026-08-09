import { useEffect, useState } from "react";
import { subscribeCompras } from "../lib/firestore/compras";

export function useCompras() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeCompras((items) => {
      setCompras(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { compras, loading };
}
