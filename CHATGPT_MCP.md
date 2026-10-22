# ChatGPT y Home Logistics

Home Logistics expone un servidor MCP Streamable HTTP en `/mcp`. La integración
inicial permite consultar la lista activa, buscar productos del catálogo,
agregar productos existentes y registrar una compra. Cada operación usa el usuario y el hogar activo
de la cuenta autorizada; las acciones de escritura mantienen los controles de
rol existentes.

## Requisitos de despliegue

Configurar en el entorno de producción:

- `MCP_SERVER_URL`: URL HTTPS canónica y completa, terminada en `/mcp`.
- `MCP_OAUTH_ALLOWED_CLIENT_IDS`: IDs OAuth que Supabase registró para el
  conector de ChatGPT, separados por comas.
- `SUPABASE_AUTH_URL` y `SUPABASE_AUTH_PUBLISHABLE_KEY`: los valores ya usados
  por la autenticación Supabase de Home Logistics.

El servidor rechaza tokens que no sean de Supabase, que no tengan la audiencia
`authenticated`, que no estén vigentes, cuyo cliente OAuth no esté en la lista
permitida o cuya identidad no esté vinculada a `app_users.auth_user_id`.

## Habilitar OAuth en Supabase

1. En Supabase, habilitar **Authentication → OAuth Server**.
2. Configurar la ruta de autorización como `https://<dominio>/oauth/consent` y
   agregar la misma URL a **Authentication → URL Configuration → Redirect URLs**.
3. Habilitar Google en Supabase Auth con las mismas credenciales OAuth usadas
   por Home Logistics.
4. Usar firma JWT asimétrica (RS256 o ES256) para que OpenID Connect pueda
   emitir los tokens solicitados por ChatGPT.
5. Habilitar el registro dinámico de clientes si se usa DCR. Tras el primer
   intento de conexión de ChatGPT, revisar el cliente creado en Supabase,
   agregar su ID a `MCP_OAUTH_ALLOWED_CLIENT_IDS` y reintentar la conexión. La
   lista permitida es obligatoria; el servidor no acepta cualquier cliente.

La pantalla `/oauth/consent` obliga al usuario a iniciar sesión con Google,
muestra el cliente y los permisos solicitados, y requiere una decisión explícita.
La aprobación queda revocable desde las concesiones OAuth del usuario en
Supabase.

## Probar en ChatGPT

En ChatGPT, habilitar el modo desarrollador según el plan disponible y agregar
un conector MCP remoto con la URL `MCP_SERVER_URL`. ChatGPT descubre OAuth desde
`/.well-known/oauth-protected-resource/mcp`; el proveedor de autorización es
Supabase. Probar primero con una cuenta de QA y una lista de prueba.

## Publicar en el directorio

Que el endpoint funcione no lo publica automáticamente. Para solicitar su
inclusión pública, falta empaquetar el plugin con sus metadatos de publicación,
tener una política de privacidad pública y completar la verificación de la
identidad publicadora en OpenAI. Luego hay que enviar el MCP remoto al portal de
plugins y pasar su revisión. No se publica ni se envía nada desde este repo.
