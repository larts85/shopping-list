# Estado de Preview del PR #12

El 11 de octubre de 2026, con autorización explícita del usuario, se preparó `preview_lists` dentro del proyecto Supabase shopping-list. Se aplicaron allí todas las migraciones del PR, sin modificar las tablas `public`. Sus 15 tablas tienen RLS y el esquema no concede acceso a anon/authenticated.

El catálogo de preview tiene las 16 categorías y 141 productos de `data/argentina-catalog.json`. No se copiaron compras, listas ni datos personales de producción. Los usuarios y listas creados al iniciar sesión en preview pertenecen a ese esquema; Supabase Auth es compartido a nivel de proyecto.

Se habilitó Google en Supabase con el cliente OAuth home-logistics para verificar ID tokens. Se conservaron los controles de nonce y email. La sesión NextAuth mantiene el callback de Google Cloud ya autorizado. No se requiere el secreto OAuth de Google para este intercambio de ID tokens.

Se configuraron `SUPABASE_AUTH_URL`, `SUPABASE_AUTH_PUBLISHABLE_KEY` y `SUPABASE_DB_SCHEMA=preview_lists` únicamente en Vercel Preview. Se redesplegó la rama sin merge. El login real se verificó con larts85@gmail.com (admin) y masajelasmanos@gmail.com (user), con vínculos a auth.users confirmados.

Preview de la rama: https://home-logistics-git-fix-global-catalog-ad0f31-larts85s-projects.vercel.app

Para producción siguen pendientes la revisión y aplicación de las migraciones sobre su destino, la configuración de Auth en Vercel Production y la validación correspondiente. No fusionar ni promover este PR automáticamente. El envío real de correo sigue pendiente de configurar un remitente/proveedor autorizado; no se copiaron credenciales de dyarti.

## Reparación de Preview — 13 de octubre de 2026

La preview de `develop` no podía abrir las listas. Vercel registró `42P01` en `GET /api/households`: faltaba `list_name_suggestions` en `preview_lists`. El mismo esquema carecía de las cinco columnas de `shopping_list` añadidas por `20261013014402_provisional_list_items`, aunque ambas migraciones estaban registradas y sus objetos existían en `public`. La lista de carritos podía cargarse, pero `ListAccessProvider` fallaba al pedir los metadatos del slug; una vez resuelto eso, la consulta de artículos también habría fallado por las columnas provisionales ausentes.

Se aplicaron a `preview_lists` exclusivamente las migraciones existentes `20261012072758_list_name_suggestions` y `20261013014402_provisional_list_items`, conservando RLS y revocando privilegios de `anon`/`authenticated`. No se ejecutaron operaciones sobre filas de Preview ni sobre `public`. Tras la reparación, el mismo slug abrió la lista, la UI mostró el estado vacío normal y Vercel registró `200` para `/api/households`, `/api/categories/get-categories` y `/api/list/get-list-products-by-categories`.

El historial global de Supabase no valida que las migraciones estén reflejadas en el schema aislado `preview_lists`. Después de cada cambio de schema, verificar por separado las relaciones/columnas requeridas por Preview y aplicar allí las migraciones pendientes; `yarn verify:catalog` aplica el conjunto de migraciones en PGlite para detectar regresiones del contrato local.

El despliegue `develop` en `451114a` falló durante TypeScript por callbacks `Autocomplete.onChange` ausentes en ocho consumidores. El alias conserva el último deployment exitoso `a884860`; los callbacks se completaron en este arreglo para que la rama vuelva a compilar y pueda publicar una preview actualizada. No se promovió ni desplegó a Production.
