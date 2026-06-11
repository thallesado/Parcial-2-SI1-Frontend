# Modulos administrativos

Cada archivo representa una seccion del panel administrativo. Esta separacion evita que `admin/page.tsx` sea demasiado grande.

## Modulos actuales

- `DashboardModule.tsx`: indicadores, graficos y resumen.
- `ExamenesModule.tsx`: busqueda de postulantes, notas, promedio y estado final.
- `ReportesModule.tsx`: reportes paginados y filtro por gestion.
- `BitacoraModule.tsx`: acciones registradas en el sistema.

## Cuando mover algo aqui

Si una parte del panel:

- tiene muchos estados propios;
- consume endpoints propios;
- renderiza una tabla o formulario grande;
- puede entenderse como pantalla independiente;

entonces conviene crear un modulo nuevo.

## Relacion con backend

Los modulos llaman endpoints de `backend/routes/api.php` usando `src/lib/api.ts`.
