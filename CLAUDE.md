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
   `pieza_unica_encargada`. Producto: nombre, **marca del repuesto** (fabricante de la
   pieza, ej. Bosch, Monroe — obligatoria, dinámica), **marca del vehículo compatible**
   (ej. Toyota, Nissan — opcional, dinámica, dato DISTINTO de la marca del repuesto),
   categoría (`repuesto` | `accesorio`), si es accesorio → subcategoría
   (Herramientas / Aditivos / Adornos-aromatizantes), tipo de repuesto (campo separado de
   ambas marcas — ej. Alternadores, Amortiguadores, Bujías, Bombas de Agua, Balatas,
   Rótulas; lista abierta, se crean tipos nuevos dinámicamente igual que las marcas),
   modelo de vehículo compatible, año desde/hasta, **código original/universal** (mismo
   código reconocido por todos los proveedores; se completa manualmente con el tiempo, no
   se auto-genera ni se busca por IA — ver sección del Excel), **proveedores** (lista, al
   menos uno obligatorio; cada proveedor tiene su propio código para ese producto — un
   mismo producto puede tener varios proveedores con códigos distintos), stock, precio
   costo, precio venta, fecha de ingreso, foto (opcional; en la lista se muestra un botón
   "Ver foto" que carga la imagen solo al hacer clic, no automáticamente — así no se
   relentiza la lista con 1.700 productos). Buscador por marca (de repuesto o de
   vehículo), modelo y año; lista paginada de a 50.
   **Foto temporalmente desactivada en el formulario** (campo deshabilitado, con nota
   "disponible más adelante"): Firebase Storage requiere el plan de pago "Blaze" de
   Google (aunque el uso real caiga dentro de la cuota gratis) y el usuario decidió
   resolver eso más adelante. Cuando se retome: activar Storage con plan Blaze, quitar
   `disabled` del input de foto en `ProductoFormModal.jsx`.
   **Respaldo**: botón "Exportar a Excel" en Inventario (`src/lib/exportarExcel.js`,
   librería `@e965/xlsx` — NO usar el paquete `xlsx` de npm a secas, tiene
   vulnerabilidades sin parchar; `@e965/xlsx` republica las versiones parchadas oficiales
   de SheetJS). Es un respaldo manual bajo demanda, no automático — Firestore ya es
   durable por sí solo, esto es solo conveniencia/tranquilidad para el usuario. Genera un
   archivo `.xlsx` con una fila por combinación producto+proveedor, igual que la
   estructura del Excel original.
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
  mapea a la lista `proveedores` en Firestore (cada fila del Excel = un producto con un
  proveedor y su código; si el mismo producto aparece en varias filas con distinto
  Importador, el script debe agruparlas en un solo producto con varios proveedores).
- La columna **"Marca"** del Excel corresponde a **marca del repuesto** (fabricante de la
  pieza, campo obligatorio en el sistema) → mapeo directo, ya viene con datos reales para
  los ~1.700 productos, no requiere inferencia. La **marca del vehículo** (campo opcional
  en el sistema) **no está** en el Excel — queda vacía/null en todos los productos
  importados; se completa manualmente después si se necesita.
- **"Código Original"** = código universal (el mismo para todos los proveedores). El
  Excel actual **no tiene este dato cargado**. No se debe intentar buscarlo/completarlo
  automáticamente vía IA o web scraping a granel — el riesgo de asignar códigos
  incorrectos en repuestos automotrices es alto (pieza equivocada). Queda vacío al
  importar; se completa manualmente con el tiempo, producto por producto, cuando el
  negocio tenga el dato a mano.
- El Excel **no tiene** columnas de Categoría ni Tipo de repuesto. El script de importación
  intenta **inferir** ambas por palabras clave en el nombre del `Artículo` (ej. "alternador"
  → tipo `Alternadores`, categoría `repuesto`). Lo que no se puede inferir queda vacío/null
  para clasificar manualmente después desde el sistema. Esto es una primera pasada
  automática, no se espera que sea perfecta.
- Filas incompletas (sin stock o sin fecha, etc.) **no deben romper el script** — esos
  campos quedan vacíos/null en Firestore.
- Las listas de "Tipo de repuesto", "Marca del repuesto", "Marca del vehículo" y
  "Proveedores" son **abiertas**: se pueden crear valores nuevos dinámicamente desde el
  sistema. No hay listas cerradas fijas.

## Convenciones de código

- JavaScript, no TypeScript.
- Sin comentarios explicando "qué hace" el código (los nombres ya lo dicen); solo
  comentarios cuando hay una razón no obvia.
- Componentes de React en `src/components/` (reutilizables) y `src/pages/<Sección>/`
  (pantallas). `src/context/` para estado global (ej. autenticación). `src/firebase.js`
  centraliza la conexión a Firebase.
