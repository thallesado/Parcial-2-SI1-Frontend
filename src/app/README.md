# Carpeta app

Next.js usa esta carpeta para definir rutas.

## Rutas actuales

- `/`: `page.tsx`, portal publico.
- `/admin`: `admin/page.tsx`, panel administrativo.
- `/inscripcion`: `inscripcion/page.tsx`, formulario publico.

## Archivos globales

- `layout.tsx`: estructura general de la app.
- `globals.css`: estilos globales y TailwindCSS.
- `favicon.ico`: icono del sitio.

## Como agregar una ruta

Crea una carpeta nueva dentro de `app/` y agrega un `page.tsx`.

Ejemplo:

```text
src/app/nueva-ruta/page.tsx
```
