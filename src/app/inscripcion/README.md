# Inscripcion publica

Esta ruta permite que un postulante se registre desde afuera sin iniciar sesion administrativa.

## Archivo principal

- `page.tsx`

## Flujo del formulario

1. Datos personales.
2. Contacto.
3. Informacion academica.
4. Carreras postuladas.
5. Confirmacion de datos.
6. Pago embebido con Stripe Payment Element.
7. Confirmacion final con grupo asignado y boleta.

## Reglas importantes

- La inscripcion no se consolida hasta que el backend confirma el pago de Stripe.
- Si el pago no se confirma dentro del plazo definido, la operacion temporal se cancela.
- Al finalizar, el backend intenta asignar grupo automaticamente.
- Si no hay grupo disponible, aparece pendiente de grupo.

## Backend relacionado

- `backend/app/Http/Controllers/Api/PublicInscripcionController.php`
- `backend/resources/views/pdf/boleta-inscripcion.blade.php`
- `sql/11_public_registration_payments_schedules.sql`
