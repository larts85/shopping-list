# Autenticación Google

NextAuth v5 autentica mediante Google OAuth con sesión JWT y duración de 12 horas. Configurar `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` y `AUTH_SECRET` en `.env` privado. `NEXTAUTH_SECRET` legado también es reconocido; mantener una única fuente coherente.

Registrar en Google Cloud el origen y callback por entorno: desarrollo de este worktree `http://localhost:2021` y `http://localhost:2021/api/auth/callback/google`. Producción debe utilizar su dominio HTTPS real.

El login solicita `openid email profile` y exige `email_verified`. El usuario inicia sesión y cierra sesión mediante Server Actions. Las rutas `/logistic` comprueban sesión en layout y cada acción/API vuelve a autenticar y autorizar por hogar.

La importación histórica es opcional y solicita Sheets y Drive con scopes readonly mediante consentimiento explícito. Habilitar esas APIs solo para importar/buscar la planilla. No requiere Gmail ni acceso de escritura a Drive. Conservar la planilla original. La base operativa es Supabase, no Google Sheets.

Los tokens OAuth se conservan en la sesión JWT cifrada; nunca registrarlos ni incluir secretos en Git. La callback de sesión existente incorpora accessToken/idToken; evitar imprimir respuestas completas de `/api/auth/session`. La conexión Supabase y su contraseña permanecen en código server-only con TLS verificado.
