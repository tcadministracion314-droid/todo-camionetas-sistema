import { useAuth } from "../../context/AuthContext";
import NuevaCotizacionForm from "./NuevaCotizacionForm";

export default function CotizacionesPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-black uppercase text-marca-azul">Cotizaciones</h1>
      <NuevaCotizacionForm vendedor={user} />
    </div>
  );
}
