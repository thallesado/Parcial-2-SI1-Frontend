# Panel administrativo

Aqui esta la pantalla administrativa principal del sistema.

## Archivo principal

- `page.tsx`: coordina login, menu lateral, carga de datos y render de modulos.

## Subcarpetas

- `_components/`: componentes reutilizables del panel.
- `_modules/`: modulos separados para reducir el tamano de `page.tsx`.

## Modulos administrativos

- Dashboard.
- Postulantes.
- Examenes.
- Carreras.
- Materias.
- Docentes.
- Asignacion de docentes.
- Grupos y aulas.
- Cupos.
- Horarios.
- Reportes.
- Bitacora.

## Flujo general

1. El usuario inicia sesion.
2. El frontend guarda token de sesion.
3. Las pantallas llaman al backend usando `apiGet` y `apiSend`.
4. El middleware del backend valida la sesion.
5. El usuario puede administrar datos del sistema.

## Recomendacion

Si un bloque crece mucho dentro de `page.tsx`, conviene moverlo a `_modules/`.
