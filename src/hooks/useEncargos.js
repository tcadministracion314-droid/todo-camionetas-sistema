import { useEffect, useState } from "react";
import { subscribeEncargos } from "../lib/firestore/encargos";

export function useEncargos() {
  const [encargos, setEncargos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeEncargos((items) => {
      setEncargos(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { encargos, loading };
}
