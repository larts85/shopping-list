<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# Home Logistics — instrucciones para Codex

## Contexto del proyecto

Aplicación Next.js App Router con TypeScript, React, Tailwind CSS y NextAuth.
Los datos se almacenan en Supabase Postgres; Google Sheets/Drive se usan solo
para importar datos anteriores con acceso de lectura. Las rutas están en
`app/`, las operaciones del servidor en `app/actions/` y `app/api/`, los
componentes en `app/ui/` y `shared/`, y las utilidades en `utils/`.
Consultar `package.json`, `memory-bank/` y `GOOGLE_AUTH.md` para el contexto actual.

Usar Yarn porque el repo versiona `yarn.lock`. `yarn dev` inicia el servidor en
el puerto 2021; `yarn lint` verifica ESLint y `yarn build` genera la aplicación.
Usar `yarn typecheck` para TypeScript. Consultar `package.json` para scripts
de verificación y `SUPABASE_VERIFICATION.md` para sus requisitos.
Antes de cambiar APIs de Next.js, leer la guía correspondiente instalada en
`node_modules/next/dist/docs/`.

## Sistema compartido del agente

`.ai-assistant/commands/` contiene workflows reutilizables para Home Logistics;
`.ai-assistant/rules/` contiene las reglas del proyecto y `.ai-assistant/skills/`
las instrucciones especializadas. Los adaptadores de `.agents/skills/` apuntan
solo a archivos de este checkout. `.codex/config.toml` configura Codex a nivel
local del proyecto. Consultar [.codex/README.md](.codex/README.md) para invocaciones.

Aplicar estas reglas al trabajo correspondiente:

- [Implementación](.ai-assistant/rules/implementation.md): cambios de código y revisión.
- [Validación](.ai-assistant/rules/validation.md): selección de checks y verificación.
- [Entrega](.ai-assistant/rules/delivery.md): ramas, commits, PRs y despliegues.

Leer únicamente el workflow relevante cuando se invoque una skill. Los prompts
locales de tareas anteriores no son instrucciones activas. No incorporar logs,
chats, backups ni contenido de otros proyectos al sistema compartido.

Las instrucciones actuales del usuario y el contexto real del repo tienen
prioridad sobre los workflows. Usar herramientas disponibles, sin asumir MCP
externos ni ampliar la autorización para publicar, desplegar o enviar mensajes.
Mantener credenciales locales y conservar cambios ajenos a la tarea.
