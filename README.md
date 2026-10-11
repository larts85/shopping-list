# Home Logistics

Aplicación para organizar categorías, productos, listas y compras de hogares compartidos. Google autentica al usuario; Supabase Postgres guarda los datos.

## Desarrollo

Requiere Node >=22 y Yarn 1.22.22. Copiar `.env.example` a `.env` (privado), configurar OAuth Google y conexión Postgres de Supabase. Usar la CA oficial del proyecto, incluida en `supabase/certs`; TLS siempre verifica el certificado.

```sh
yarn deps:install
yarn typecheck
yarn lint
yarn build
yarn dev
```

Este worktree utiliza http://localhost:2021. Configurar el callback OAuth correspondiente: `http://localhost:2021/api/auth/callback/google`. `dev:clean` limpia únicamente los archivos de este checkout y no mata servidores de otros puertos.

Versiones exactas: Next 16.4, React 19.3, TypeScript 6.0.3, Tailwind 4.3.3 y NextAuth beta32. La instalación congela `yarn.lock`, bloquea lifecycle scripts y comprueba origen HTTPS npm e integridad SHA-512.

## Datos y autorización

`app/lib/database.ts` conecta al pooler Postgres exclusivamente en el servidor. Cada operación autentica la sesión Google y filtra por hogar activo. El email Google debe estar verificado. Las transacciones y bloqueos evitan listas duplicadas y compras archivadas dos veces. Categorías con productos no pueden borrarse; borrar un producto quita su entrada de lista y conserva snapshots históricos.

Todas las tablas públicas tienen RLS y los roles `anon` y `authenticated` carecen de privilegios. No hay acceso directo del navegador a la base: la autorización por hogar se aplica en el servidor que usa el usuario Postgres. No publicar la contraseña ni prefijarla con `NEXT_PUBLIC_`.

`supabase/migrations` contiene el esquema inicial. El esquema del proyecto actual ya fue aplicado; no ejecutar de nuevo CREATE TABLE. Las versiones `20261010064936` y `20261010071941` ya están registradas como aplicadas en el historial remoto. El CLI debe usar el pooler de sesión (puerto 5432) para sus prepared statements; la aplicación usa el pooler de transacción (6543). Antes de nuevas migraciones, comparar `supabase migration list` y revisar `supabase db push --dry-run`.

## Importación anterior

Datos → Autorizar lectura de Google Sheets → pegar enlace/ID → Revisar antes de importar → Importar a Supabase. Solo el propietario puede importar, una vez y en un hogar vacío. Lee `categories`, `products`, `list`, `historical`; conserva planilla, fechas y columnas repetidas, remapea identificadores y guarda todo en una transacción. No escribe en Google.

El login normal solicita únicamente `openid email profile`. La importación solicita puntualmente Sheets/Drive de solo lectura. Luego las operaciones habituales no dependen de Google Sheets ni de Drive.

## Hogares compartidos

El propietario invita por email desde Datos. La persona invitada acepta al iniciar sesión con ese mismo email; puede cambiar entre sus hogares. El propietario puede cancelar invitaciones y revocar acceso. No se envían correos ni se modifican permisos de Drive.

## Verificación

Con servidor 2021 y `.env` configurado:

```sh
yarn verify:supabase
yarn verify:households
yarn verify:import
```

El script crea usuarios y hogares sintéticos identificados por UUID bajo `example.invalid`, utiliza sesiones JWT firmadas con el secreto local y limpia únicamente sus fixtures. Comprueba autenticación, CRUD, aislamiento, cálculos, concurrencia, archivo atómico y todas las páginas. No omite autenticación en la aplicación. `verify:households` comprueba invitación, aceptación, cambio, revocación y una revocación concurrente. `verify:import` ejecuta el importador real con respuestas Sheets sintéticas y Postgres aislado, incluyendo rollback y reimportación. Ver [SUPABASE_VERIFICATION.md](SUPABASE_VERIFICATION.md) para cobertura y límites de las verificaciones.

## Agente de desarrollo

Ver [configuración de Codex](.codex/README.md) para las skills, workflows y reglas
de trabajo de este repo.
