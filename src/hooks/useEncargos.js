import { useDatosContext } from "../context/DatosContext";

export function useEncargos() {
  const { encargos, encargosLoading } = useDatosContext();
  return { encargos, loading: encargosLoading };
}
