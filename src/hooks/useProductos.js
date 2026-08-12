import { useDatosContext } from "../context/DatosContext";

export function useProductos() {
  const { productos, productosLoading } = useDatosContext();
  return { productos, loading: productosLoading };
}
