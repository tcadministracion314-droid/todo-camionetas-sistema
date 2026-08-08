import { useEffect, useState } from "react";
import { subscribeTodasVentas } from "../lib/firestore/ventas";

export function useTodasLasVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeTodasVentas((items) => {
      setVentas(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { ventas, loading };
}
