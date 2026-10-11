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

Los endpoints y payloads de datos se conservaron. La revisión posterior añadió manejo de errores, estados de carga y prevención de envíos duplicados en la interfaz. No se cambiaron API routes, acciones, autenticación, archivos de entorno ni persistencia. La pantalla de datos retiró el botón de depuración `prueba` del flujo visible.

Integrar los commits en orden. Si la migración a Supabase o la actualización técnica cambió los mismos componentes, conservar sus cambios en handlers e imports de datos y trasladar el JSX y los estilos de esta rama. `AGENTS.md` fue generado por Next y se conserva según las instrucciones del proyecto.

Este registro permite continuar en otra sesión sin releer toda la conversación. No existe una medición disponible del porcentaje de contexto para garantizar un máximo del 50% por sesión.


## Revisión posterior en el navegador de Codex

Se revisaron todas las pantallas modificadas: login, configuración inicial, lista, agregar, inicio de administración, categorías, productos y datos. Se utilizó la sesión existente de Google para consultar datos reales. La lista real estaba vacía; las API de categorías y productos respondieron 200. No se agregaron, editaron, compraron o eliminaron datos reales ni se enviaron correos o permisos.

Correcciones aplicadas:

- Jerarquía de encabezados y textos de diálogos en español; eliminación de producto ahora identifica correctamente el producto.
- Nombres accesibles específicos en botones de categorías y disposición resistente a nombres largos sin espacios.
- Acciones de lista vacía deshabilitadas; confirmación visible de guardado y errores recuperables, sin espera indefinida ni falso éxito ante HTTP 500.
- Selección global derivada de los productos, con estado mixto. Si la API falla, la selección se revierte y los controles vuelven a estar disponibles.
- Respuestas de productos fuera de orden no reemplazan la categoría más reciente; se evita mostrar productos de la categoría anterior durante la carga.
- Formularios y diálogos previenen envíos duplicados y muestran fallos; los diálogos se mantienen abiertos ante fallos HTTP. El registro de compra admite Enter, valores decimales y validación de cantidad, medida y precio.
- Recuperación visible ante errores de carga de categorías y productos, en lugar de un catálogo vacío engañoso.
- Estado accesible de carga en el botón compartido y acento rojo para confirmar eliminación.

Verificación: escritorio y móvil a 320 px, nombres largos sin desbordamiento horizontal, foco y Escape en diálogos, diálogo de solicitud con scroll interno a 320 × 400 px. Una vista temporal con fetch simulado comprobó guardado correcto, HTTP 500 de carga y escritura, reversión de selección, estado mixto, edición, eliminación y registro de compra sin acceder a datos reales; se eliminó antes de compilar.

Build de producción y TypeScript aprobados. ESLint sobre todos los TSX modificados: cero errores y cero advertencias con la configuración de la sesión de dependencias. Se conserva la advertencia anterior de deprecación de middleware. El envío real de correos, la creación de archivos y las escrituras en la base de datos no se ejecutaron durante esta revisión.

Servidor local dejado encendido: `http://localhost:2035`, desde este worktree. Pestaña del navegador de Codex conservada para revisión del usuario.


## Integración con Supabase y campos compactos

Se combinaron los estilos con el PR #4 y las dependencias del PR #3. Se conservaron la autenticación del layout, los hogares e invitaciones de Supabase y la eliminación de las pantallas de archivos de Google Sheets. Los campos del listado mantienen nombres accesibles, encabezados visibles Cantidad/Medida, bordes redondeados, anchos de 56/64 px y alturas de 40 px en móvil y 36 px en escritorio. Guardar vuelve a consultar la lista para conservar la respuesta del servidor; el payload conserva precio=0 como en la migración.

Validación local de integración: ESLint y TypeScript aprobados. La integración de dependencias/Supabase y la visual compilaron con Next 16.4.0. La revisión visual autenticada nueva sigue pendiente por el límite de revisión automática del navegador. Las pruebas visuales anteriores documentadas arriba corresponden a la rama original de estilos, no a esta integración.
