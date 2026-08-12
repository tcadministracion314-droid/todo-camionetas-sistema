import { createContext, useContext, useEffect, useState } from "react";
import { subscribeProductos } from "../lib/firestore/productos";
import { subscribeEncargos } from "../lib/firestore/encargos";
import { subscribeCotizaciones } from "../lib/firestore/cotizaciones";
import { subscribeCompras } from "../lib/firestore/compras";

const DatosContext = createContext(null);

// Las colecciones que se consultan desde varias pantallas se suscriben una
// sola vez acá, mientras dure la sesión — no cada vez que alguien navega a
// Inventario, Ventas, Reportes, Encargos, Historial, Clientes o Compras.
// Eso evita repetir la lectura completa de la coleccion (2.800+ productos)
// en cada cambio de pantalla, que era la principal causa de que se agotara
// la cuota gratis de Firestore.
export function DatosProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [productosLoading, setProductosLoading] = useState(true);
  const [encargos, setEncargos] = useState([]);
  const [encargosLoading, setEncargosLoading] = useState(true);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cotizacionesLoading, setCotizacionesLoading] = useState(true);
  const [compras, setCompras] = useState([]);
  const [comprasLoading, setComprasLoading] = useState(true);

  useEffect(() => {
    const unsubscribes = [
      subscribeProductos((items) => {
        setProductos(items);
        setProductosLoading(false);
      }),
      subscribeEncargos((items) => {
        setEncargos(items);
        setEncargosLoading(false);
      }),
      subscribeCotizaciones((items) => {
        setCotizaciones(items);
        setCotizacionesLoading(false);
      }),
      subscribeCompras((items) => {
        setCompras(items);
        setComprasLoading(false);
      }),
    ];
    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  return (
    <DatosContext.Provider
      value={{
        productos,
        productosLoading,
        encargos,
        encargosLoading,
        cotizaciones,
        cotizacionesLoading,
        compras,
        comprasLoading,
      }}
    >
      {children}
    </DatosContext.Provider>
  );
}

export function useDatosContext() {
  const ctx = useContext(DatosContext);
  if (!ctx) {
    throw new Error("useDatosContext debe usarse dentro de <DatosProvider>.");
  }
  return ctx;
}
