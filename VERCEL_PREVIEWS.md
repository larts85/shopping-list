# Pull request previews

The Vercel project is `home-logistics` in `larts85s-projects`, connected to
`larts85/shopping-list`. Commits on non-production branches create Preview
deployments; `main` is the production branch. Vercel posts deployment links and
statuses on pull requests.

The project uses the Next.js preset, the repository root, and the package's build
command. Check the deployment's environment in Vercel before redeploying.

Configure these server-only variables as **Secret**, scoped to **Preview**:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `SUPABASE_PASSWORD_DB` for the Supabase migration branch

Never commit their values. Redeploy after changing environment variables.

Google OAuth must allow the preview's callback URL:
`https://<preview-host>/api/auth/callback/google`. Opening a deployment does not
by itself verify Google login or database access. Keep Vercel's deployment
protection enabled when testing previews with the application's real data.

## URL compartida para PRs a develop

El workflow `develop-preview.yml` conserva `https://home-logistics-develop-preview.vercel.app`.
La integración Git de Vercel construye cada rama automáticamente; al recibir un deployment exitoso,
el workflow asigna esa URL al build Preview más reciente de los heads actuales de PRs abiertos,
no draft, del mismo repositorio y dirigidos a `develop`. Si varios PRs están abiertos, la URL
compartida muestra el último build exitoso. Las URLs individuales de cada rama siguen disponibles.
Los builds fallidos, Production, forks y commits obsoletos no reemplazan la URL. Cuando todos los
PRs se cierran, conserva el último deployment para revisión. No es un merge combinado de todos los PRs.

Activación (una sola vez, una vez que el workflow esté en la rama predeterminada `main`):

1. Crear en GitHub el environment `preview-alias`, restringido a `main`.
2. El propietario crea directamente un token Vercel limitado al equipo `larts85s-projects`,
   con vencimiento, y lo guarda como secret `VERCEL_TOKEN` de ese environment. No compartirlo
   en chats ni guardarlo en archivos del repo. Renovarlo antes del vencimiento.
3. Ejecutar `Stable develop PR preview` con `workflow_dispatch` para inicializar el alias.
4. Autorizar en el cliente OAuth Google el callback
   `https://home-logistics-develop-preview.vercel.app/api/auth/callback/google`.
5. Abrir un PR a develop y esperar su check Vercel y el workflow. Verificar el SHA indicado en
   el resumen del workflow y visitar la URL compartida. Al retargetear un PR ya desplegado,
   usar la ejecución manual o esperar la reconciliación programada (aproximadamente 10 minutos;
   GitHub puede demorarla). Un PR cuyo build no está listo mantiene la preview anterior.

El evento deployment_status solo inicia una notificación sin permisos ni secretos.
El workflow de asignación se inicia con workflow_run en main: no descarga artifacts ni caches
del workflow anterior y consulta nuevamente GitHub y Vercel. Lee exclusivamente la rama predeterminada, no hace checkout del head de un PR,
no instala dependencias y utiliza el token únicamente en `api.vercel.com`. Tiene concurrencia
serializada y no retrocede el alias a un deployment anterior. No modifica protección de deployments.

## Integración y producción

`develop` recibe Preview deployments y su alias de rama permanece estable tras cada merge.
`main` es la rama de Production configurada en Vercel; el repositorio no tiene `master`.
La asignación automática de dominios de Production está habilitada. Un merge a `main` construye
Production y publica el dominio `https://project-qoqim.vercel.app` si el build finaliza correctamente.
El release se crea desde `develop` hacia `main`, siguiendo `.cursor/commands/release.md`.

Callback de Production: `https://project-qoqim.vercel.app/api/auth/callback/google`.
Las cuatro variables de autenticación y base de datos configuradas en Preview requieren
configuración independiente y autorización del propietario para Production.

Validación local de la selección y del orden de deployments:
`node --test scripts/update-develop-preview.test.mjs`.
