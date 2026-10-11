# Actualización de dependencias — 10 de octubre de 2026

- Next.js y eslint-config-next: 16.1.1 → 16.4.0.
- React y React DOM: 18.3.1 → 19.3.0, con tipos correspondientes.
- Tailwind CSS y su integración PostCSS: 4.1.18 → 4.3.3.
- google-auth-library: 9.10.0 → 11.2.0; google-spreadsheet: 4.1.2 → 5.3.0.
- NextAuth: beta.30 → beta.32, fijado exactamente para controlar cambios beta.
- TypeScript: 5.9.3 → 6.0.3. La versión 7 queda fuera del rango soportado por typescript-eslint.
- ESLint: 9.39.2 → 9.39.5. Los plugins de React y accesibilidad todavía no admiten ESLint 10.
- Actualizados PostCSS, Prettier, sus plugins, react-icons, react-spinners y dependencias transitivas compatibles.
- Eliminados googleapis y dotenv (sin usos activos), @types/google-spreadsheet (tipos incluidos en la biblioteca) y @eslint/eslintrc (configuración plana).
- Declarados explícitamente el parser y plugin TypeScript de ESLint; corregido el parser sin cambiar las reglas existentes.
- Node.js mínimo 22; tipos de Node alineados con esa versión. Yarn 1.22.22 y yarn.lock siguen siendo la fuente de instalación.

## Comprobaciones

- Compilación de producción y comprobación TypeScript satisfactorias.
- ESLint y TypeScript pasan después de corregir los errores detectados, sin desactivar reglas.
- Auditoría después de renovar las dependencias transitivas: 0 críticas, 1 alta, 0 moderadas, 0 bajas. La alta corresponde a braces 3.0.3, usado por fast-glob en el tooling de eslint-config-next; el aviso no ofrece versión corregida. No se forzó una sustitución incompatible.
- Migrada la protección de rutas de middleware.ts a proxy.ts (Node Runtime) y corregido el matcher a /logistic/:path* para redirigir antes de consultar Google cuando no hay sesión. Se preservó la lógica local existente.
- Verificación con sesión Google real: categorías/productos, selección, lista, compra e histórico, administración y formularios sin envío. Datos QA limpiados y checks originales preservados. Login/logout final confirmado con callback Google302 y /logistic200; ver VERIFICATION_REPORT.md.

## Instalación reproducible

```bash
yarn deps:install
yarn typecheck
yarn build
yarn dev
```

## Política de instalación de dependencias

- Todas las dependencias directas usan versiones exactas, incluidas las versiones beta. Node >=22 es una restricción del runtime; no instala ni actualiza Node.
- Yarn 1.22.22 está declarado en packageManager. .yarnrc fija save-exact, ignora scripts de instalación y exige lockfile congelado en instalaciones normales.
- .npmrc bloquea scripts y fija save-exact también para invocaciones accidentales de npm; el gestor soportado de este repositorio es Yarn. No generar un segundo lockfile.
- `yarn deps:install` comprueba la política y ejecuta la instalación con --frozen-lockfile --ignore-scripts --non-interactive.
- `yarn deps:check` rechaza rangos de versiones, hooks automáticos en el proyecto, fuentes fuera de registry.npmjs.org y paquetes bloqueados sin integridad SHA-512.
- La instalación offline se completó con scripts omitidos. El lockfile mantiene versiones transitivas concretas aunque sus selectores incluyan rangos declarados por terceros. No quitar esos selectores: congelar el lockfile impide resolver versiones nuevas.
- Actualizar dependencias requiere una modificación explícita y revisión del manifest y lockfile. No usar --update-checksums para aceptar contenido inesperado.
- Estas restricciones reducen ejecución durante instalación y cambios inesperados; no garantizan que el código de una versión fijada sea seguro al ejecutarlo con dev/build/start. Tampoco impiden que alguien con escritura en el repo o flags explícitos cambie la política.
- Documentación: https://classic.yarnpkg.com/en/docs/cli/install y https://classic.yarnpkg.com/lang/en/docs/yarnrc/.

- Comprobación final tras corrección logout: lint/typecheck/deps:check pasan; build producción termina0 en35.73s. Auditoría final conserva1alta braces sin parche,0críticas. Dev2020 abierto.
