import { useEffect, useState } from "react";
import { subscribeGastos } from "../lib/firestore/gastos";

export function useGastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeGastos((items) => {
      setGastos(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { gastos, loading };
}
