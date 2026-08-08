import { useEffect, useState } from "react";
import { subscribeClientes } from "../lib/firestore/clientes";

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeClientes((items) => {
      setClientes(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { clientes, loading };
}
