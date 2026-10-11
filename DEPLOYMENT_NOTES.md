# Estado de Preview del PR #12

El 11 de octubre de 2026, con autorización explícita del usuario, se preparó `preview_lists` dentro del proyecto Supabase shopping-list. Se aplicaron allí todas las migraciones del PR, sin modificar las tablas `public`. Sus 15 tablas tienen RLS y el esquema no concede acceso a anon/authenticated.

El catálogo de preview tiene las 16 categorías y 141 productos de `data/argentina-catalog.json`. No se copiaron compras, listas ni datos personales de producción. Los usuarios y listas creados al iniciar sesión en preview pertenecen a ese esquema; Supabase Auth es compartido a nivel de proyecto.

Se habilitó Google en Supabase con el cliente OAuth home-logistics para verificar ID tokens. Se conservaron los controles de nonce y email. La sesión NextAuth mantiene el callback de Google Cloud ya autorizado. No se requiere el secreto OAuth de Google para este intercambio de ID tokens.

Se configuraron `SUPABASE_AUTH_URL`, `SUPABASE_AUTH_PUBLISHABLE_KEY` y `SUPABASE_DB_SCHEMA=preview_lists` únicamente en Vercel Preview. Se redesplegó la rama sin merge. El login real se verificó con larts85@gmail.com (admin) y masajelasmanos@gmail.com (user), con vínculos a auth.users confirmados.

Preview de la rama: https://home-logistics-git-fix-global-catalog-ad0f31-larts85s-projects.vercel.app

Para producción siguen pendientes la revisión y aplicación de las migraciones sobre su destino, la configuración de Auth en Vercel Production y la validación correspondiente. No fusionar ni promover este PR automáticamente. El envío real de correo sigue pendiente de configurar un remitente/proveedor autorizado; no se copiaron credenciales de dyarti.
