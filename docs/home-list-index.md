# Home e índice de listas

`/logistic` es Home. El índice autenticado `/api/households?view=home` devuelve todas las listas de las que el usuario es miembro y las invitaciones pendientes para su correo. La interfaz separa Mis listas, Compartidas conmigo e Invitaciones pendientes. Las tarjetas abren `/logistic/lists/<slug>` y no dependen de la lista que estuviera activa en la pestaña.

Visitar Home no crea hogares/listas. También se eliminó la creación implícita de `ensureHousehold`: las pantallas que necesitan una lista sin selección válida muestran una recuperación hacia Home. Catálogo y administración siguen siendo globales y se pueden visitar sin crear una lista. La creación explícita autentica al usuario y crea solo una lista y su membresía, sin depender de una lista fuente.

El modal reutiliza `shared/components/ui/Modal.tsx`, con foco y Escape. Solicita un nombre personalizado o permite Usar predeterminado. El servidor valida el nombre y calcula Compras dd/mm/aaaa en America/Argentina/Buenos_Aires cuando se elige el predeterminado. No se renombraron listas existentes ni se cambió el esquema.

Compartir lista pide y valida el correo primero. Solo después de guardar la invitación muestra el enlace exacto, permite copiarlo y comunica el estado real de entrega. Se retiró la copia genérica de la pantalla de compra para evitar confundir copiar con invitar. El enlace por sí solo no concede acceso.

Aceptar devuelve la lista y slug exactos, agrega membresía de colaborador y no modifica user_preferences. La navegación conserva la selección por pestaña; la lista propia y sus productos permanecen disponibles en Home. El banner existente también usa el resultado exacto de aceptación.

## Validación local

- 145 comprobaciones con PostgreSQL PGlite y HTTP; Home sin listas, sin autocreación, validación de nombres, nombre por fecha argentina, varias propias, pendientes, compartidas aceptadas, preferencias propias intactas y no bypass de membresía.
- 27 comprobaciones offline de entrega/islamiento del entorno/fecha argentina, incluidos los límites de medianoche UTC frente al día argentino.
- lint, build y TypeScript pasan.
- Navegador integrado de Codex con build de producción local: Home vacío; modal abierto sin crear filas (conteo cero); creación por defecto y personalizada con slugs distintos; Home con ambas propias; ausencia del botón de copiar antes de invitar; copia disponible tras guardar; tarjeta pendiente → slug → aceptar → lista compartida con rol colaborador → Home conserva propia y compartida.

Se usaron exclusivamente fixtures example.invalid y base efímera, con sesiones locales de prueba suministradas por un arnés temporal externo a la aplicación. No se enviaron correos reales. El arnés y la base se cerraron después de verificar.

## Entrega

Los cambios e7b5e4a y 4d6ab6b se publicaron en PR14 y se integraron a develop mediante 3d26df5. La release del 11/10/2026 incluye esta ampliación y todos los cambios de develop desde la producción anterior b8bd56b.

La base de producción quedó preparada con la migración transaccional 20261012022304 production_lists_catalog_roles_slugs: 5 listas y sus nombres conservados, 5 slugs únicos, 159 productos, 7 compras, 7 históricos, 5 membresías y 2 invitaciones intactos. Las tablas originales y el respaldo privado production_backup_20261012 se conservan. SUPABASE_AUTH_URL y SUPABASE_AUTH_PUBLISHABLE_KEY están configuradas para Production y Preview. La comprobación del deployment y los flujos remotos se registra en el PR de release; estas validaciones locales no sustituyen la verificación de producción.

El caso exacto de rechazo reportado sigue pendiente del enlace y correo usados. La lectura de preview anterior encontró listas sin invitados/colaboradores; no se concedió acceso sin invitación para intentar resolverlo.
