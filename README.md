# Frontend Next.js

Esta carpeta contiene la interfaz web del sistema.

Incluye:

- Portal publico de la universidad.
- Formulario publico de inscripcion.
- Panel por roles para administrador, secretaria y docente.
- Consumo de API Laravel.
- Componentes de tablas, paginacion y modulos administrativos.

## Tecnologias

- React 19
- Next.js 16
- TypeScript
- TailwindCSS
- lucide-react

## Instalacion

```powershell
npm install
```

## Configuracion

Crea `frontend/.env.local` si necesitas indicar la URL del backend:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

En produccion debe apuntar al backend desplegado en Render:

```env
NEXT_PUBLIC_API_URL=https://TU_BACKEND_RENDER.onrender.com/api
```

## Ejecutar localmente

```powershell
npm run dev:stable
```

URLs:

```text
Portal publico:       http://127.0.0.1:3000
Panel administrativo: http://127.0.0.1:3000/admin
Inscripcion publica:  http://127.0.0.1:3000/inscripcion
```

## Comandos utiles

```powershell
npm run lint
npm run build
npm run dev:stable
```

## Estructura

- `src/app/page.tsx`: pagina publica de inicio.
- `src/app/admin/page.tsx`: panel administrativo.
- `src/app/admin/_components/`: componentes reutilizables del panel.
- `src/app/admin/_modules/`: modulos separados del panel.
- `src/app/inscripcion/page.tsx`: formulario publico por pasos.
- `src/lib/api.ts`: cliente HTTP y tipos compartidos.
- `public/imagenes/`: imagenes del portal publico.

## Imagenes

Las imagenes que se pueden usar directamente con rutas como `/imagenes/logo_uagrm.png` estan en:

```text
public/imagenes/
```

La portada publica usa constantes en:

```text
src/app/page.tsx
```

Busca:

```ts
const HERO_BACKGROUND_URL = "/imagenes/curichi_uagrm.jpg";
const UAGRM_LOGO_URL = "/imagenes/logo_uagrm.png";
```

## Relacion con backend

El frontend no se conecta directamente a PostgreSQL. Siempre llama a Laravel mediante `src/lib/api.ts`.

Flujo:

```text
Pantalla React -> apiGet/apiSend -> Laravel API -> PostgreSQL
```

El login recibe una lista de `secciones` permitidas. El menu lateral filtra sus
opciones con esa lista, pero Laravel tambien valida cada endpoint para evitar
que la seguridad dependa solamente de la interfaz.
