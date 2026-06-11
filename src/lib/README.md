# Libreria compartida del frontend

Contiene utilidades usadas por varias pantallas.

## Archivo principal

- `api.ts`

## Que hace api.ts

- Define la URL base del backend.
- Expone `apiGet`.
- Expone funciones para enviar datos al backend.
- Formatea errores de Laravel para mostrarlos de forma clara.
- Define tipos compartidos como gestiones, carreras, postulantes y respuestas paginadas.

## Cuando modificarlo

- Si cambia la URL del backend.
- Si cambia el formato de errores.
- Si necesitas agregar tipos TypeScript compartidos.
- Si quieres cambiar headers, tokens o manejo de sesion.
