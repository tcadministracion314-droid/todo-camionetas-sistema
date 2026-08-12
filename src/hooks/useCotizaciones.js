import { useDatosContext } from "../context/DatosContext";

export function useCotizaciones() {
  const { cotizaciones, cotizacionesLoading } = useDatosContext();
  return { cotizaciones, loading: cotizacionesLoading };
}
