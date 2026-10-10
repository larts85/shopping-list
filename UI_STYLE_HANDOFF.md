# Diseño de interfaz en escala de grises

Rama: `codex/grayscale-ui`.
Worktree: `/Users/imadev/.codex/worktrees/grayscale-ui/home-logistics`.
Base: `48ceac5436a9d42c70aa5980548689e788dad206`.

## Diseño

Tailwind 4 se carga con `@import "tailwindcss"`. El plugin PostCSS y las dependencias ya existían: esta rama no cambia sus versiones ni el lockfile. Fondo zinc claro, superficies blancas, bordes suaves y acciones principales oscuras. Rojo se reserva para eliminar y errores.

La navegación muestra la sección activa y se adapta a pantallas pequeñas. Las páginas comparten títulos y espaciado. La lista agrupa los productos en tarjetas plegables, muestra el estado comprado y permite editar cantidad y medida. Los formularios, botones, listas, estados vacíos y diálogos comparten estilos.

`Modal` utiliza `dialog.showModal()` para contener el foco y admite Escape. Al cerrar restaura el foco al control de origen y el scroll del documento. `TextInput` usa identificadores estables con `useId`, con mensajes asociados a cada campo.

## Validación realizada

- TypeScript: `tsc --noEmit --incremental false`, aprobado.
- Producción: `next build --webpack`, aprobado.
- Tailwind: CSS generado mediante PostCSS; utilidades de grilla y backdrop presentes.
- ESLint sobre todos los TSX modificados: cero errores; una advertencia anterior por `checked: any` en el selector. Se utilizó el archivo de configuración actualizado de la sesión de dependencias; la configuración antigua del commit base no fue modificada aquí.
- Navegador: lista en escritorio a 1280 px y móvil a 390 px, campos de 44 px de alto y sin desbordamiento horizontal. Formulario de productos a 390 y 320 px, botones de edición y eliminación de 44 × 44 px. Login real a 320 px.
- Diálogos de compra y edición de producto: apertura, nombres accesibles, foco inicial, Escape y retorno de foco comprobados.
- La revisión de lista y productos usó una ruta temporal con datos ficticios, eliminada antes de la entrega. No se realizaron operaciones sobre datos reales. No se verificó el flujo autenticado contra la base de datos.
- El servidor temporal del puerto 2035 fue detenido.

Se reutilizó `node_modules` del checkout principal mediante un enlace local ignorado por Git (Next 16.4.0, Tailwind 4.3.3 y React 19.3.0 durante la validación). La instalación exacta del lockfile antiguo no fue probada. El build conserva la advertencia de deprecación de `middleware.ts`; su migración pertenece a las otras sesiones.

## Integración y continuación

Los handlers de datos de lista, selector y productos se conservaron. No se cambiaron API routes, acciones, autenticación, archivos de entorno ni persistencia. La pantalla de datos retiró el botón de depuración `prueba` del flujo visible.

Integrar los commits en orden. Si la migración a Supabase o la actualización técnica cambió los mismos componentes, conservar sus cambios en handlers e imports de datos y trasladar el JSX y los estilos de esta rama. `AGENTS.md` fue generado por Next y se conserva según las instrucciones del proyecto.

Este registro permite continuar en otra sesión sin releer toda la conversación. No existe una medición disponible del porcentaje de contexto para garantizar un máximo del 50% por sesión.
