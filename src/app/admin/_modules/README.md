# Modulos administrativos

Cada archivo representa una seccion del panel administrativo. Esta separacion evita que `admin/page.tsx` sea demasiado grande.

## Modulos actuales

- `DashboardModule.tsx`: indicadores, graficos y resumen.
- `ExamenesModule.tsx`: busqueda de postulantes, notas, promedio y estado final.
- `ReportesModule.tsx`: reportes paginados, filtro por gestion y exportacion PDF/Excel.
- `BitacoraModule.tsx`: acciones registradas en el sistema.
- `UsuariosModule.tsx`: cuentas, roles y vinculacion con docentes.
- `MisHorariosModule.tsx`: calendario personal del usuario docente.

## Cuando mover algo aqui

Si una parte del panel:

- tiene muchos estados propios;
- consume endpoints propios;
- renderiza una tabla o formulario grande;
- puede entenderse como pantalla independiente;

entonces conviene crear un modulo nuevo.

## Relacion con backend

Los modulos llaman endpoints de `backend/routes/api.php` usando `src/lib/api.ts`.
