# Google y Supabase Auth

El navegador inicia OAuth mediante NextAuth. El callback Google permanece en `/api/auth/callback/google`. El servidor verifica el email confirmado y transmite el ID token a Supabase Auth mediante `signInWithIdToken`. Supabase crea o recupera la identidad en `auth.users`; su UUID se vincula a `app_users`. La sesión NextAuth contiene solo el identificador y datos de perfil.

Configurar el proveedor Google de Supabase con el mismo cliente OAuth que NextAuth y las variables server-side `SUPABASE_AUTH_URL` y `SUPABASE_AUTH_PUBLISHABLE_KEY`. No se utiliza una clave `service_role` ni un endpoint público de sincronización de perfiles. No habilitar `skip_nonce_check` para resolver errores. El login falla si falta la configuración o si Supabase rechaza el token o devuelve otro correo/proveedor.

El callback de develop autorizado en Google es:
`https://home-logistics-git-develop-larts85s-projects.vercel.app/api/auth/callback/google`.
El de producción es:
`https://elcarritodelacompra.vercel.app/api/auth/callback/google`.
Los dominios de otras ramas deben registrarse antes de probar su login.

Los permisos globales residen en `app_users.role`, protegida de `anon` y `authenticated`; solo `larts85@gmail.com` puede tener `admin`. Los permisos de propietario/colaborador de una lista no conceden ese rol. Ninguna operación confía en `user_metadata` ni en un rol enviado por el cliente.

Documentación: [Google en Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google).
