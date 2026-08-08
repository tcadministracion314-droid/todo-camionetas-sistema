import { useEffect, useState } from "react";
import { subscribeCotizaciones } from "../lib/firestore/cotizaciones";

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeCotizaciones((items) => {
      setCotizaciones(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { cotizaciones, loading };
}
