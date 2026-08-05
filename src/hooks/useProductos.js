import { useEffect, useState } from "react";
import { subscribeProductos } from "../lib/firestore/productos";

export function useProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeProductos((items) => {
      setProductos(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { productos, loading };
}
