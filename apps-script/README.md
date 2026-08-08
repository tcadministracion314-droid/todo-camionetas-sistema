# Respaldo automático a Google Sheets

Este código **no se despliega desde aquí** — vive dentro de un proyecto de Google Apps
Script asociado a una Google Sheet, fuera de este repositorio. Estos archivos son solo
la copia de referencia/control de versiones.

- `Code.gs`: lee todos los productos de Firestore (paginado) vía la API REST de Firestore,
  autenticado con la cuenta de Google del dueño del script (no usa ninguna clave de
  servicio) y escribe una fila por combinación producto+proveedor en la hoja
  "Inventario". Función `crearDisparadorDiario()` programa que corra sola todos los días
  a las 3 AM.
- `appsscript.json`: manifiesto con los permisos (OAuth scopes) que necesita el script —
  Sheets, llamadas externas (Firestore REST API) y Datastore/Firestore.

Ver instrucciones de instalación en la conversación con el usuario / `CLAUDE.md`.
