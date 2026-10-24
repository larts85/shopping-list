# Funcionalidades soportadas

Este documento es el inventario interno de capacidades de Home Logistics. Cada
funcionalidad visible o invocable por una entidad debe registrarse aquí cuando
se incorpora a `develop`, junto con su estado de disponibilidad en la interfaz
web y en el MCP cuando corresponda.

El inventario se mantiene por entidad, no por archivo técnico. Un cambio de
comportamiento debe actualizar esta lista en el mismo PR. El check
`yarn verify:feature-docs` impide integrar cambios funcionales sin esa
actualización.

## Hogares y listas

| Funcionalidad | Web | MCP |
| --- | --- | --- |
| Crear, activar, cambiar, renombrar y eliminar listas | Sí | No |
| Abrir una lista por slug y compartirla | Sí | No |
| Invitar miembros, aceptar o rechazar invitaciones | Sí | No |
| Gestionar roles de propietario, editor y lector | Sí | No |
| Revocar acceso o abandonar una lista | Sí | No |
| Sugerir y revisar nombres de lista | Sí | No |
| Sugerir eliminación de una lista compartida | Sí | No |
| Consultar la lista activa | Sí | Sí (`get_active_shopping_list`) |

## Artículos y catálogo

| Funcionalidad | Web | MCP |
| --- | --- | --- |
| Buscar y agregar productos a una lista | Sí | Sí (`search_products`, `add_item_to_list`) |
| Autocompletar productos y seleccionar categorías | Sí | No |
| Editar nombre, cantidad, unidad y detalles de artículos | Sí | No |
| Editar artículos en lote y desmarcar productos | Sí | No |
| Eliminar productos de una lista | Sí | No |
| Mover artículos a otra lista | Sí | No |
| Administrar categorías | Sí | No |
| Solicitar productos de catálogo y revisar solicitudes | Sí | No |

## Compra y carrito

| Funcionalidad | Web | MCP |
| --- | --- | --- |
| Ver carrito y lista de compras | Sí | No |
| Marcar artículos como comprados con cantidad, unidad y precio | Sí | Sí (`mark_item_purchased`) |
| Registrar precio unitario o total y descripción | Sí | Sí (`mark_item_purchased`) |
| Desmarcar artículos comprados | Sí | No |
| Editar o eliminar artículos del carrito | Sí | No |
| Agregar artículos en lote | Sí | Sí (`add_item_to_list`) |
| Completar una compra y archivar el ciclo de lista | Sí | No |

## Historial y sugerencias

| Funcionalidad | Web | MCP |
| --- | --- | --- |
| Consultar historial paginado de compras | Sí | No |
| Editar artículos del historial | Sí | No |
| Repetir una compra anterior | Sí | No |
| Enviar y revisar sugerencias de productos o listas | Sí | No |

## Cuenta y administración

| Funcionalidad | Web | MCP |
| --- | --- | --- |
| Iniciar sesión con Google y sincronizar la cuenta | Sí | Sí (OAuth MCP) |
| Consultar el perfil conectado | Sí | Sí (`get_account_profile`) |
| Administrar usuarios y roles globales | Sí (admin) | No |

## Regla de actualización

Cuando un PR agrega, elimina o cambia una funcionalidad de cualquiera de estas
entidades, debe modificar la fila correspondiente o agregar una nueva. Si una
capacidad solo está disponible en la web, el MCP o ambos, debe indicarse
explícitamente en las columnas respectivas. Las funciones internas, refactors y
cambios de estilo que no alteren una capacidad observable no requieren una
nueva fila, pero el PR debe dejar intacto el inventario.
