import { useDatosContext } from "../context/DatosContext";

export function useCompras() {
  const { compras, comprasLoading } = useDatosContext();
  return { compras, loading: comprasLoading };
}
