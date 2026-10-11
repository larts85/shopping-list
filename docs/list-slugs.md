# Enlaces estables a listas

Cada hogar/lista tiene un `slug` independiente de su UUID, generado por Postgres con el formato `lista-` más 32 caracteres hexadecimales. El enlace es `/logistic/lists/<slug>` y no cambia al renombrar la lista. La restricción UNIQUE impide identificadores duplicados; el default cubre creación normal, automática e importaciones. La migración rellena las listas anteriores en la misma operación y no cambia membresías, datos ni permisos RLS.

El propietario puede invitar por correo y los miembros pueden copiar el enlace. Conocer el enlace no concede acceso. El servidor solo devuelve la lista exacta para un miembro o una invitación pendiente del correo autenticado. El invitado debe aceptar mediante el flujo existente; después conserva el rol colaborador. Un enlace ajeno, revocado o inexistente muestra el mismo error, sin revelar metadatos. La resolución del enlace tiene prioridad sobre la selección guardada de la pestaña y no modifica las preferencias de otras pestañas. Al cambiar de lista desde el selector se vuelve a `/logistic`.

El proxy conserva el destino durante Google login. La acción de login acepta únicamente destinos internos con el formato de slug esperado, evitando redirecciones externas. Los correos de invitación reciben el enlace completo a la lista.

## Integración

Aplicar `supabase/migrations/20261011223114_list_slugs.sql` al esquema de destino antes de publicar el código. Para previews con esquema separado, seguir el procedimiento existente de migraciones para ese esquema, sin usar `public` como fallback. La migración se aplicó únicamente a `preview_lists` para validar PR13. `public` queda pendiente de la futura entrega a producción. El callback OAuth del PR12 se reemplazó por el de PR13 en Google Cloud.

Base local: `71e73bc` de PR12. PR12 se integró primero a `develop`; `codex/list-slugs` se actualizó con ese estado sin conflictos. PR de la feature: https://github.com/larts85/shopping-list/pull/13.

## Validación

- `node scripts/verify-global-catalog.mjs`: 114 checks con PostgreSQL PGlite y HTTP locales; backfill, restricción UNIQUE, defaults para listas nuevas, resolución exacta, validación de slug, anonimato, aislamiento, invitación por email, aceptación por destinatario, revocación y retorno de login, además de la regresión global existente.
- `node --experimental-strip-types scripts/verify-invitation-delivery.mjs`: 21 checks offline de Resend/Gmail; enlace exacto sin sufijos agregados. No se enviaron correos.
- `yarn lint`, `yarn build`, `yarn typecheck`: pasan.

En el preview se verificó un login Google real, retorno al slug de una lista existente, selección exacta y confirmación del botón de copia. La prueba de acceso denegado detectó mensajes de Server Actions ocultos en producción; la resolución por slug ahora usa el API existente con errores esperados explícitos.

En el navegador integrado de Codex, contra el build de producción local y una base PGlite efímera, se verificaron creación desde UI con slug automático, enlace que sustituye la selección previa de la pestaña, botón de copia, rechazo de lista ajena con mensaje claro, aceptación desde enlace por destinatario, controles bloqueados para colaborador, revocación y retorno de login anónimo. Se usaron sesiones JWT de fixtures `example.invalid`, suministradas por un arnés temporal externo a la app; no se incorporaron accesos de prueba al código. No se enviaron correos reales. El portapapeles mostró confirmación de copia en UI, aunque la herramienta de lectura no devolvió su contenido.
