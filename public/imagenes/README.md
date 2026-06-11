# Imagenes publicas

Aqui se guardan las imagenes del portal publico.

## Archivos actuales

- `logo_uagrm.png`: logo usado en la barra superior.
- `curichi_uagrm.jpg`: imagen de fondo del hero.

## Como usar una imagen

Si guardas:

```text
frontend/public/imagenes/fondo.jpg
```

en React la ruta es:

```text
/imagenes/fondo.jpg
```

## Donde cambiar portada y logo

Archivo:

```text
frontend/src/app/page.tsx
```

Constantes:

```ts
const HERO_BACKGROUND_URL = "/imagenes/curichi_uagrm.jpg";
const UAGRM_LOGO_URL = "/imagenes/logo_uagrm.png";
```
