import { useEffect, useState } from "react";
import { subscribeCatalogo } from "../lib/firestore/catalogo";

export function useCatalogo(coleccion) {
  const [valores, setValores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeCatalogo(coleccion, (items) => {
      setValores(items.map((item) => item.nombre));
      setLoading(false);
    });
    return unsubscribe;
  }, [coleccion]);

  return { valores, loading };
}
