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
- **Hosting**: publicado en Firebase Hosting — `https://gestion-de-ventas-c5cf8.web.app`
  (gratis, plan Spark, no requiere Blaze). Deploy: `npm run build` + `firebase deploy
  --only hosting`. El login normal de `firebase-tools` no funciona en este entorno (no
  hay navegador interactivo) — se usa una cuenta de servicio en su lugar: variable de
  entorno `GOOGLE_APPLICATION_CREDENTIALS` apuntando a
  `datos-privados/firebase-service-account.json` (nunca se sube a git). Esa misma cuenta
  de servicio **no tiene permiso** para `firestore:rules`/`storage` deploy (falla con 403
  en `serviceusage.googleapis.com`) — las reglas de Firestore/Storage se pegan
  manualmente en la consola de Firebase, no por CLI.
  **Importante:** cualquier despliegue a Hosting (o cambio de configuración en Firebase/
  Google Cloud en general) es una acción visible/pública — pedir confirmación explícita
  antes de ejecutarlo, no asumir luz verde de una decisión de alcance general.

## Paleta de colores (del logo real de la marca)

- Rojo principal: `#BE000A` → clase Tailwind `marca-rojo`
- Azul principal: `#00327D` → clase Tailwind `marca-azul`
- Blanco: `#FFFFFF` → clase Tailwind `marca-blanco`
- Estilo visual: bloques sólidos de color, alto contraste, tipografía gruesa/robusta
  (font-black, uppercase en títulos y botones), **sin gradientes ni tonos pasteles**.
  Es la estética de un letrero de repuestos automotrices, no una app "suave" de startup.

## Secciones del sistema

1. **Inventario** — dividido en 3 subtipos: `en_bodega`, `proyectado` (aún no comprado),
   `pieza_unica_encargada`. Producto (datos "de catálogo", uno solo por producto): nombre,
   **marca del repuesto** (fabricante de la pieza, ej. Bosch, Monroe — obligatoria,
   dinámica), **marca del vehículo compatible** (ej. Toyota, Nissan — opcional, dinámica,
   dato DISTINTO de la marca del repuesto), categoría (`repuesto` | `accesorio`), si es
   accesorio → subcategoría (Herramientas / Aditivos / Adornos-aromatizantes), tipo de
   repuesto (campo separado de ambas marcas — ej. Alternadores, Amortiguadores, Bujías,
   Bombas de Agua, Balatas, Rótulas; lista abierta, se crean tipos nuevos dinámicamente
   igual que las marcas), modelo de vehículo compatible, año desde/hasta, **código
   original/universal** (mismo código reconocido por todos los proveedores; se completa
   manualmente con el tiempo, no se auto-genera ni se busca por IA — ver sección del
   Excel), **glosa técnica** (texto libre opcional, notas/especificaciones), foto
   (opcional; en la lista se muestra un botón "Ver foto" que carga la imagen solo al
   hacer clic, no automáticamente — así no se relentiza la lista con 1.700 productos).

   **Proveedores** (lista, al menos uno obligatorio) — esto NO es solo un nombre: **cada
   proveedor tiene su propio Costo, precio de Venta, Stock y Fecha de ingreso**, además de
   su código para ese producto. Esto refleja la realidad del negocio: el mismo producto
   puede comprarse a distintos proveedores con distinto costo/precio/stock/fecha cada vez
   (así viene el Excel real, fila por fila). El producto **no tiene** Costo/Venta/Stock/
   Fecha a nivel general — esos datos siempre viven dentro de cada entrada de
   `proveedores`. En las pantallas (tabla, reportes) el Stock que se muestra es la
   **suma** de todos los proveedores; Costo/Venta se muestran como rango (o un solo valor
   si coinciden entre proveedores).

   Buscador por marca (de repuesto o de vehículo), modelo, año o proveedor; lista
   paginada de a 50.
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

Vive en `datos-privados/` (nunca en git, ya subido por el usuario). Es un archivo de
**5.944 filas × 21 columnas**, pero NO es una tabla plana — es un diseño "para imprimir"
con celdas combinadas. Estructura real (confirmada inspeccionando el archivo con
`scripts/inspeccionar-excel.mjs`):

- Fila 1: título general (combinado, ignorar). Fila 3: encabezados, pero cada campo
  ocupa VARIAS columnas físicas combinadas (ej. "Artículo" ocupa A-D, "Marca" ocupa E-H,
  "Modelo" ocupa I-K). Solo la celda de más a la izquierda de cada combinación tiene el
  valor real — las demás son `null` al leer con una librería de Excel. Hay que resolver
  esto con el mapa de `!merges` de la hoja (ver el script de inspección para el patrón).
- **El archivo está organizado en 44 "secciones"**, cada una con una fila-título
  combinada de una sola celda (ej. "Alternadores", "Bujías", "Bombas de Agua", "Rótulas",
  "Accesorios y Aditivos"...). **Estos títulos de sección SON el dato de "Tipo de
  repuesto"** — no hace falta inferirlo del nombre del artículo, ya viene ordenado así.
  Hay que normalizar espacios múltiples en los títulos (ej. "Anillos   Motor" →
  "Anillos Motor"). Una sola sección, **"Accesorios y Aditivos"** (154 filas), corresponde
  a categoría `accesorio` — el resto son categoría `repuesto` con `tipoRepuesto` = el
  título de su sección.
  - **Decisión**: los 154 productos de "Accesorios y Aditivos" se importan con
    `subcategoria: null` (no se puede distinguir Herramientas/Aditivos/Adornos desde el
    Excel) — se clasifican manualmente después desde el sistema.
  - Dentro de cada sección también hay 217 filas que repiten la fila de encabezado
    ("Artículo | Marca | Modelo | ...") — hay que saltarlas, no son datos.
- Columnas de datos por fila: Artículo, Marca (=marca del repuesto), Modelo, Año,
  Importador (=proveedor), Código Importador, Costo, Venta, Stock, Fecha, Código
  Original. **3.421 filas son datos reales** (el resto son vacías, títulos de sección, o
  encabezados repetidos).
- **El mismo producto (mismo Artículo+Marca+Modelo+Año) aparece en varias filas cuando
  tiene más de un proveedor** — y Costo/Venta/Stock/Fecha pueden diferir entre esas filas
  del "mismo" producto. **Decisión del usuario: "conservar todos"** — no se consolida a
  un solo valor. Cada fila del Excel se importa como **una entrada dentro del arreglo
  `proveedores`** del producto (nombre, código, costo, venta, stock, fecha vienen todos
  de esa fila). Esto encaja naturalmente con el modelo de datos ya descrito arriba — no
  requiere lógica de agregación, solo agrupar filas por identidad de producto
  (Artículo+Marca+Modelo+Año) y juntar sus filas como proveedores del mismo producto.
- **"Código Original"** = código universal. El Excel actual casi no tiene este dato
  cargado. No se debe intentar buscarlo/completarlo automáticamente vía IA o web scraping
  a granel — el riesgo de asignar códigos incorrectos en repuestos automotrices es alto
  (pieza equivocada). Queda vacío al importar cuando falte; se completa manualmente con
  el tiempo, producto por producto.
- Fechas vienen como número de serie de Excel (ej. `45814`), hay que convertirlas a fecha
  real, no dejarlas como número.
- Filas/columnas incompletas (falta Stock, Fecha, Costo, etc. en filas puntuales)
  **no deben romper el script** — esos campos quedan vacíos/null en Firestore para esa
  entrada de proveedor.
- Las listas de "Tipo de repuesto", "Marca del repuesto", "Marca del vehículo" y
  "Proveedores" son **abiertas**: se pueden crear valores nuevos dinámicamente desde el
  sistema. No hay listas cerradas fijas.
- Hay al menos una sección con título ambiguo/truncado ("V", 15 filas) — importar tal
  cual y que el usuario lo corrija manualmente si hace falta, no es bloqueante.

## Convenciones de código

- JavaScript, no TypeScript.
- Sin comentarios explicando "qué hace" el código (los nombres ya lo dicen); solo
  comentarios cuando hay una razón no obvia.
- Componentes de React en `src/components/` (reutilizables) y `src/pages/<Sección>/`
  (pantallas). `src/context/` para estado global (ej. autenticación). `src/firebase.js`
  centraliza la conexión a Firebase.
