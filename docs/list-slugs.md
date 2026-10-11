# Enlaces estables a listas

Cada hogar/lista tiene un `slug` independiente de su UUID, generado por Postgres con el formato `lista-` más 32 caracteres hexadecimales. El enlace es `/logistic/lists/<slug>` y no cambia al renombrar la lista. La restricción UNIQUE impide identificadores duplicados; el default cubre creación normal, automática e importaciones. La migración rellena las listas anteriores en la misma operación y no cambia membresías, datos ni permisos RLS.

El propietario puede invitar por correo y los miembros pueden copiar el enlace. Conocer el enlace no concede acceso. El servidor solo devuelve la lista exacta para un miembro o una invitación pendiente del correo autenticado. El invitado debe aceptar mediante el flujo existente; después conserva el rol colaborador. Un enlace ajeno, revocado o inexistente muestra el mismo error, sin revelar metadatos. La resolución del enlace tiene prioridad sobre la selección guardada de la pestaña y no modifica las preferencias de otras pestañas. Al cambiar de lista desde el selector se vuelve a `/logistic`.

El proxy conserva el destino durante Google login. La acción de login acepta únicamente destinos internos con el formato de slug esperado, evitando redirecciones externas. Los correos de invitación reciben el enlace completo a la lista.

## Integración

Aplicar `supabase/migrations/20261011223114_list_slugs.sql` al esquema de destino antes de publicar el código. Para previews con esquema separado, seguir el procedimiento existente de migraciones para ese esquema, sin usar `public` como fallback. Esta entrega no ejecuta migraciones remotas ni cambia configuración de autenticación.

Base local: `71e73bc` de PR12. La rama `codex/list-slugs` está en `/private/tmp/home-logistics-list-slugs`; integrar su commit en la rama de PR12 una vez terminada la coordinación de conflictos.

## Validación

- `node scripts/verify-global-catalog.mjs`: 114 checks con PostgreSQL PGlite y HTTP locales; backfill, restricción UNIQUE, defaults para listas nuevas, resolución exacta, validación de slug, anonimato, aislamiento, invitación por email, aceptación por destinatario, revocación y retorno de login, además de la regresión global existente.
- `node --experimental-strip-types scripts/verify-invitation-delivery.mjs`: 21 checks offline de Resend/Gmail; enlace exacto sin sufijos agregados. No se enviaron correos.
- `yarn lint`, `yarn build`, `yarn typecheck`: pasan.

No se ejercitó un login Google real ni el portapapeles en navegador. Las pruebas de retorno verifican la redirección HTTP; la aceptación y los permisos se verifican por API contra la base efímera. No se ejecutó el SQL contra Supabase remoto.
