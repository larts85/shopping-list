# Verificación de migración Supabase — 10 de octubre de 2026

## Resultado

Migración implementada en `codex/supabase-migration`, exclusivamente en el worktree existente. El checkout principal y su servidor 2020 no se modificaron. Se incorporaron por lectura las dependencias y los ajustes de interfaz de la otra sesión, conservando Next 16.4, React 19.3, TypeScript 6.0.3 y Tailwind 4.3.3.

La importación real se ejecutó una vez. La comparación posterior de solo lectura pasó: **7 categorías, 13 productos, 0 entradas de lista, 7 históricos y 4 productos seleccionados**. Se compararon nombres, categorías, selección y todos los campos de los snapshots históricos, incluyendo fechas y encabezados repetidos. La lista real está vacía; por ello su comparación comprueba el conteo. No se modificó ni eliminó la planilla original.

## Evidencia automatizada

| Verificación | Resultado | Cobertura |
| --- | --- | --- |
| `yarn lint` | Pasa | Sin errores ni advertencias |
| `yarn typecheck` | Pasa | TypeScript de la versión final |
| `yarn build` | Pasa | Next 16.4, producción, 30 rutas |
| `yarn deps:check` | Pasa | Versiones exactas, sin hooks de instalación, 469 paquetes SHA-512 |
| `yarn verify:supabase` | 42 checks pasan | CRUD, autenticación, aislamiento, cantidades/medidas/precios, concurrencia, archivo atómico y seis páginas |
| `yarn verify:households` | 29 checks pasan | Invitación idempotente, destinatario, owner-only, aceptación, cambio, cancelación, revocación y revocación concurrente |
| `yarn verify:import` | 27 checks pasan | Datos Sheets sintéticos, importador real y Postgres aislado: locale es_AR/en_US, columnas repetidas, referencias inválidas, IDs duplicados, números inválidos, rollback, precio cero, hogar ocupado y reimportación |
| Sin sesión | 6 redirecciones pasan | Todas las páginas `/logistic` responden 307 al inicio |

Las pruebas HTTP usan sesiones JWT firmadas localmente exclusivamente para usuarios `migration-test-UUID@example.invalid` y `outsider-UUID@example.invalid`. La aplicación conserva su autenticación normal y no contiene rutas de bypass. Las pruebas del importador sustituyen respuestas Google dentro del proceso de prueba; la importación real y su comparación se verificaron por separado en la sesión Google del usuario.

Los fixtures se limpiaron al finalizar. Consulta remota final: **0 hogares de prueba restantes**.

## Interfaz y persistencia

Sesión Google real visible en localhost:2021. Se recorrieron Lista, Agregar, Admin, Categorías, Productos y Datos. Se comprobó carga de categorías/productos desde Supabase, selector por categoría y checks existentes. Editar y eliminar categoría/producto abren sus modales y Cancelar conserva los datos. Compartir abre el formulario; el email vacío bloquea el envío mediante validación nativa y Cancelar cierra el modal. Guardar la lista vacía vuelve inmediatamente al estado normal. La consola del repaso final no contiene warnings ni errores.

Las mutaciones CRUD, compra y compartición se ejercitaron por HTTP con fixtures aisladas. No se sometieron los datos reales a operaciones de QA destructivas ni se enviaron correos. Logout/login fueron verificados en la sesión de actualización previa, cuyo arreglo de `signOut` fue integrado; esta continuación conservó la sesión real para validar la importación.

Se corrigió recuperación del hogar personal al revocar acceso. También se volvió a comprobar la membresía después de adquirir el bloqueo del hogar: una operación que espera mientras se revoca su acceso falla con 403. La prueba concurrente reproduce esta condición. Los selectores muestran errores recuperables y finalizan estados de carga ante fallos de conexión. La inspección visual encontró directivas Tailwind 3 heredadas: se migraron al import y configuración de Tailwind 4 y se actualizaron las clases de opacidad de los modales. Se verificó de nuevo el CSS generado, el modal y la vista en el navegador integrado de Codex. El build definitivo se ejecutó con el dev 2021 detenido y después se dejó abierto nuevamente.

## Base y seguridad

Nueve tablas públicas con RLS habilitado; **0 privilegios de tablas para `anon`/`authenticated`**. La base se consulta exclusivamente desde el servidor autenticado con filtros por hogar y parámetros SQL. TLS verifica el certificado con la CA oficial incluida. Advisors de seguridad: únicamente nueve avisos INFO de RLS sin políticas, intencionales para impedir acceso público; sin WARNING/ERROR. Documentación: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Se agregó el índice de `user_preferences.household_id` recomendado por el advisor. El aviso de índice recién creado sin uso es informativo, no un fallo. Baseline remoto y local coinciden en `20261010064936` y `20261010071941`; se registró el SQL existente sin volver a ejecutar CREATE TABLE. El CLI usa modo sesión 5432 para evitar prepared statements incompatibles con el pooler de transacción. No se ejecutó un reset remoto ni una nueva importación real.

`.env` dejó de estar versionado y permanece privado localmente; `.env.example` contiene solo placeholders. Las credenciales que ya estaban en commits anteriores permanecen en el historial: su rotación y una eventual limpieza de historial requieren una operación separada. No se reescribió historia ni se publicaron credenciales.

## Alcance del cierre

Código, importación real, comparación, pruebas, documentación y baseline terminados para revisión en la rama. No se hizo merge al checkout principal, push ni despliegue. La reconstrucción del esquema mediante un stack Supabase local vacío no fue ejecutada; se verificaron el esquema remoto aplicado, sus restricciones mediante operaciones y su historial. Los fallos de autorización esperados de Server Actions aparecen como errores en los logs del test negativo; no corresponden a fallos de los recorridos normales.
