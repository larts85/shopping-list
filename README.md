# El carrito de la compra

Next.js App Router, TypeScript y Postgres en Supabase. Usar Yarn y Node 22 o posterior.

## Catálogo y roles

Todas las personas autenticadas consultan el mismo catálogo general de categorías y productos. El rol global se guarda en `app_users`: `larts85@gmail.com` es `admin`; las demás cuentas son `user`. Solo el admin crea, edita o retira recursos del catálogo. Retirar un producto conserva las compras y su historial.

Un user gestiona sus propias listas: puede tener varias abiertas, seleccionar productos del catálogo, registrar cantidades positivas, unidades compatibles y compras, y consultar su historial. Los permisos sobre una lista son independientes del rol global. Compartir una lista invita a un colaborador que puede verla y sugerir cambios; el propietario los aprueba. Compartir o crear listas no concede administración del catálogo.

En **Solicitudes**, un user solicita una categoría o un producto indicando categoría y unidad. La solicitud permanece pendiente sin incorporarse al catálogo. El admin ve todas las solicitudes, sin importar su lista activa; puede aprobarlas o rechazarlas. Una aprobación publica el recurso en el catálogo común. Cada user ve el estado de sus propias solicitudes.

## Autenticación

NextAuth conserva la sesión del navegador y el callback de Google. En cada inicio de sesión, el servidor intercambia el ID token de Google mediante `Supabase.auth.signInWithIdToken`, valida que la identidad Google y el correo confirmado coincidan, y vincula `app_users.auth_user_id` con `auth.users`. Ningún endpoint acepta sincronizar un correo suministrado por el navegador. Los roles no se toman de `user_metadata` ni de tokens editables; las operaciones consultan la tabla protegida.

Configurar `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SUPABASE_AUTH_URL` y `SUPABASE_AUTH_PUBLISHABLE_KEY`. El proveedor Google debe estar habilitado en Supabase con el mismo cliente OAuth. Si la verificación en Supabase falla o falta configuración, el login falla cerrado. Los ID tokens, access tokens, refresh tokens y claves privadas no se exponen en la sesión del cliente.

## Desarrollo y comprobación

Copiar `.env.example` a un archivo local ignorado y configurar la conexión Postgres. `yarn dev`, `yarn lint`, `yarn typecheck` y `yarn build` son los comandos del proyecto.

`yarn verify:catalog` crea PostgreSQL local descartable mediante PGlite, aplica las migraciones a `preview_lists`, inicia Next en 2037 y prueba las APIs con sesiones QA firmadas. No necesita credenciales cloud, no escribe en Supabase y no envía correos. La migración comprueba la conservación de IDs de listas/compras y snapshots históricos. Los tests de la identidad Google usan un proveedor simulado; el OAuth real requiere configurar Supabase antes de desplegar.

## Entornos y envío de invitaciones

Preview exige `SUPABASE_DB_SCHEMA=preview_lists`; nunca busca tablas de producción si el esquema falta. Las migraciones son para revisión y deben aplicarse al esquema del destino antes de activar el código. Consultar [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md).

Las invitaciones siempre se guardan y aparecen como notificación al ingresar. Para enviar correo, configurar Gmail (`GMAIL_USER_EMAIL`, `GMAIL_APP_PASSWORD`) o Resend (`RESEND_API_KEY`, `INVITATION_FROM`), y `APP_URL` para el enlace. La UI distingue proveedor sin configurar, envío fallido y mensaje aceptado por el proveedor. Sin proveedor ofrece un enlace manual. No se han reutilizado credenciales de otros proyectos en este PR.

## Agente de desarrollo

Ver [configuración de Codex](.codex/README.md) para las skills, workflows y reglas
de trabajo de este repo.
