# Todo Camionetas — Sistema de Gestión de Venta e Inventario

## El negocio

"Todo Camionetas" es una tienda de repuestos y accesorios para autos y camionetas.
El sistema lo van a usar 2-3 personas a la vez, desde notebooks en el mostrador de la tienda.
Es una aplicación web (sin app móvil por ahora). El dueño/usuario principal **no es programador**:
las explicaciones y commits deben ser claras, en español simple, sin asumir conocimiento técnico.

## Arquitectura

- **Frontend**: React (Vite), JavaScript (no TypeScript), React Router para navegación,
  Tailwind CSS v4 para estilos.
- **Backend/base de datos**: Firebase — Firestore (base de datos), Authentication
  (correo/contraseña), Storage (fotos de productos).
- **Firestore es la única fuente de verdad.** No usar localStorage para datos de negocio
  (inventario, ventas, clientes, encargos). localStorage solo para preferencias de
  sesión/UI si hace falta. Todas las pantallas deben leer datos frescos desde Firestore.
- **Repositorio**: GitHub, público — `https://github.com/tcadministracion314-droid/todo-camionetas-sistema`.
  Como es público, **nunca** debe subirse: el archivo `.env.local` (claves de Firebase),
  el Excel real de inventario, ni ningún export de datos del negocio. Todo eso vive en
  `datos-privados/`, que está en `.gitignore`.
- **Firebase project**: `gestion-de-ventas-c5cf8`, región `southamerica-west1` (Santiago),
  Firestore en modo producción (Standard edition).
- **Usuarios**: cada empleado tiene su propia cuenta (correo/contraseña) vía Firebase
  Authentication — esto permite filtrar reportes "por vendedor".

## Paleta de colores (del logo real de la marca)

- Rojo principal: `#BE000A` → clase Tailwind `marca-rojo`
- Azul principal: `#00327D` → clase Tailwind `marca-azul`
- Blanco: `#FFFFFF` → clase Tailwind `marca-blanco`
- Estilo visual: bloques sólidos de color, alto contraste, tipografía gruesa/robusta
  (font-black, uppercase en títulos y botones), **sin gradientes ni tonos pasteles**.
  Es la estética de un letrero de repuestos automotrices, no una app "suave" de startup.

## Secciones del sistema

1. **Inventario** — dividido en 3 subtipos: `en_bodega`, `proyectado` (aún no comprado),
   `pieza_unica_encargada`. Producto: nombre, marca (dinámica, se crean nuevas al vuelo),
   categoría (`repuesto` | `accesorio`), si es accesorio → subcategoría
   (Herramientas / Aditivos / Adornos-aromatizantes), tipo de repuesto (campo separado de
   Marca — ej. Alternadores, Amortiguadores, Bujías, Bombas de Agua, Balatas, Rótulas;
   lista abierta, se crean tipos nuevos dinámicamente igual que las marcas), modelo de
   vehículo compatible, año desde/hasta, stock, precio costo, precio venta, fecha de
   ingreso, foto. Buscador por marca, modelo y año.
2. **Ventas** — buscador de productos con autocompletado libre (nombre/marca/modelo a la
   vez, sin elegir filtro primero), cantidad, descuento con switch %/$ , método de pago
   (efectivo, débito, crédito, transferencia). **Venta por encargo**: para productos fuera
   de catálogo — pide datos de cliente (nombre, teléfono, correo), datos del vehículo,
   descripción del producto, proveedor, pago (abono parcial o completo), fecha estimada de
   llegada. Al crear una venta por encargo se crean automáticamente: (a) el producto en
   Inventario con tipo `pieza_unica_encargada`, y (b) un registro en el Cuaderno de Encargos.
3. **Cuaderno de Encargos** — lista de encargos con estado (`pendiente` / `llego` /
   `entregado`), botón "marcar ha llegado", estado de pago (abonado vs saldo pendiente).
4. **Clientes** — ficha por cliente con historial de compras y encargos.
5. **Reportes** — evaluación de caja, ventas personalizado (por fecha/vendedor), descuentos
   otorgados, inventario valorizado por categoría + lista "por comprar" (proyectado),
   resumen de qué se vendió y cuándo.

## El Excel real de inventario

~5.944 filas / ~1.700 productos, vive en `datos-privados/` (nunca en git). Columnas:

`Artículo | Marca | Modelo | Año | Importador | Código Importador | Costo | Venta | Stock | Fecha | Código Original`

Decisiones tomadas sobre estos datos:

- **Importador** = proveedor/distribuidor del producto (dato distinto de Marca) → se
  mapea a un campo `proveedor` en Firestore.
- El Excel **no tiene** columnas de Categoría ni Tipo de repuesto. El script de importación
  intenta **inferir** ambas por palabras clave en el nombre del `Artículo` (ej. "alternador"
  → tipo `Alternadores`, categoría `repuesto`). Lo que no se puede inferir queda vacío/null
  para clasificar manualmente después desde el sistema. Esto es una primera pasada
  automática, no se espera que sea perfecta.
- Filas incompletas (sin stock o sin fecha, etc.) **no deben romper el script** — esos
  campos quedan vacíos/null en Firestore.
- La lista de "Tipo de repuesto" es **abierta**: se pueden crear tipos nuevos dinámicamente
  desde el sistema, igual que las Marcas. No hay una lista cerrada fija.

## Convenciones de código

- JavaScript, no TypeScript.
- Sin comentarios explicando "qué hace" el código (los nombres ya lo dicen); solo
  comentarios cuando hay una razón no obvia.
- Componentes de React en `src/components/` (reutilizables) y `src/pages/<Sección>/`
  (pantallas). `src/context/` para estado global (ej. autenticación). `src/firebase.js`
  centraliza la conexión a Firebase.
