# Preparación del despliegue tras revisar este PR

Este PR no debe fusionarse ni desplegarse automáticamente por el agente. No se aplicaron migraciones a la base compartida ni se cambiaron variables remotas.

1. Revisar `lists_roles_suggestions` y `global_catalog_roles_requests`. La segunda conserva IDs de productos, listas y snapshots históricos; agrupa categorías con el mismo nombre, dando prioridad a las de larts85@gmail.com. Conserva todos los productos existentes para no colapsar compras. No elimina tablas heredadas ni datos originales.
2. Preparar un esquema independiente `preview_lists`. Ejecutar las migraciones en una transacción sobre ese destino, cambiando únicamente los calificadores `public.` por `preview_lists.`. Nunca ejecutar las migraciones con calificadores public para preparar preview. Las tablas `auth.users` siguen siendo las del proyecto Supabase.
3. Configurar Vercel Preview con `SUPABASE_DB_SCHEMA=preview_lists` y la conexión Postgres. No activar el código nuevo sobre las tablas anteriores: la migración cambia las referencias de productos de las listas al catálogo general.
4. Habilitar el proveedor Google de Supabase para el cliente OAuth existente y configurar `SUPABASE_AUTH_URL` y `SUPABASE_AUTH_PUBLISHABLE_KEY`. La integración en auth.ts requiere esa configuración; no hace fallback silencioso. Supabase valida el token, el email confirmado y la identidad Google antes de vincular el UUID. Se mantiene la sesión NextAuth para compatibilidad con el callback ya autorizado.
5. Registrar en Google el callback exacto del despliegue de la rama si se quiere probar su URL propia. El callback de develop ya fue autorizado y su login previo fue verificado.
6. Para envío real de invitaciones, configurar un remitente/proveedor autorizado. El adaptador Gmail está incluido pero no se copiaron sus credenciales desde dyarti; las autorizaciones pendientes no se presumieron.
7. Antes de producción, probar Google OAuth real, aceptación de invitaciones y la entrega de correo. La suite local cubre catálogo global, roles, solicitudes, unidades, varias listas, aislamiento, acceso revocado y conservación de compras.

Producción y preview actualmente comparten proyecto Supabase. Crear un esquema aislado y configurar Auth son operaciones pendientes de aprobación/configuración; este PR solo entrega código, migraciones y pruebas para revisión.
