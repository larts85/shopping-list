# Codex en Home Logistics

`AGENTS.md` aporta el contexto persistente del repo. `.codex/config.toml` configura
Codex a nivel de proyecto; `.agents/skills/` expone los workflows compartidos de
`.ai-assistant/` mediante adaptadores con referencias relativas.

## Workflows disponibles

| Invocación | Fuente canónica |
| --- | --- |
| `$browser-testing` | [.ai-assistant/skills/browser-testing/SKILL.md](../.ai-assistant/skills/browser-testing/SKILL.md) |
| `$copy-rules` | [.ai-assistant/commands/copy-rules.md](../.ai-assistant/commands/copy-rules.md) |
| `$dev-full-cycle` | [.ai-assistant/commands/dev-full-cycle.prompt.md](../.ai-assistant/commands/dev-full-cycle.prompt.md) |
| `$feature` | [.ai-assistant/commands/feature.prompt.md](../.ai-assistant/commands/feature.prompt.md) |
| `$fix` | [.ai-assistant/commands/fix.prompt.md](../.ai-assistant/commands/fix.prompt.md) |
| `$hotfix` | [.ai-assistant/commands/hotfix.md](../.ai-assistant/commands/hotfix.md) |
| `$migrate-typescript` | [.ai-assistant/commands/migrate-typescript.md](../.ai-assistant/commands/migrate-typescript.md) |
| `$plan` | [.ai-assistant/commands/plan.md](../.ai-assistant/commands/plan.md) |
| `$prompt-base` | [.ai-assistant/commands/base.prompt.md](../.ai-assistant/commands/base.prompt.md) |
| `$push-and-deploy` | [.ai-assistant/commands/push-and-deploy.md](../.ai-assistant/commands/push-and-deploy.md) |
| `$pushup` | [.ai-assistant/commands/pushup.md](../.ai-assistant/commands/pushup.md) |
| `$release` | [.ai-assistant/commands/release.md](../.ai-assistant/commands/release.md) |
| `$review-frontend` | [.ai-assistant/commands/review-frontend.md](../.ai-assistant/commands/review-frontend.md) |
| `$test-coverage` | [.ai-assistant/commands/test-coverage.md](../.ai-assistant/commands/test-coverage.md) |
| `$testing` | [.ai-assistant/commands/testing.prompt.md](../.ai-assistant/commands/testing.prompt.md) |

## Uso y mantenimiento

Invocar, por ejemplo, `$feature`, `$plan` o `$testing` en un chat abierto en este
checkout. Codex descubre las skills en `.agents/skills/`. Si no aparecen, iniciar
un chat nuevo o reiniciar Codex. La configuración de proyecto se carga en repos
confiables; la confianza se gestiona desde Codex, no se fuerza en este repo.

Editar los workflows en `.ai-assistant/` y mantener los adaptadores apuntando a
su fuente. No crear copias de comandos en `.codex/commands/` ni prompts en
`.codex/prompts/`: los workflows del repo se distribuyen como skills.

## Reglas y alcance

Las reglas compartidas están en `.ai-assistant/rules/` y se referencian desde
`AGENTS.md`: implementación, validación y entrega. Son instrucciones para el
agente, no políticas `.rules` de aprobación de comandos.

Todos los enlaces de los adaptadores son relativos a su propio directorio:
desde `.agents/skills/feature/`, `../../../.ai-assistant/commands/feature.prompt.md`
resuelve a `.ai-assistant/commands/feature.prompt.md` **dentro de este repo**.
No depende de otro checkout, del directorio personal ni de rutas absolutas.

Se conservan solo workflows y reglas pertinentes a Home Logistics. No se
importan chats, logs, backups ni prompts del proyecto de origen. El prompt de
migración preexistente de esta app se conserva como contexto local, no como
instrucciones de inicio. No se incluyen credenciales, servidores MCP ni permisos
amplios de ejecución. La selección de checks se basa en `package.json`.

Documentación oficial: [Skills](https://learn.chatgpt.com/docs/build-skills) y
[configuración](https://learn.chatgpt.com/docs/config-file/config-reference).
