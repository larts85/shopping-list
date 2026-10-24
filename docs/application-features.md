# Funcionalidades soportadas

Este documento es el inventario interno de capacidades de Home Logistics. Cada
funcionalidad visible o invocable por una entidad debe registrarse aquí cuando
se incorpora a `develop`, junto con su estado de disponibilidad en la interfaz
web y en el MCP cuando corresponda.

El inventario se mantiene por entidad, no por archivo técnico. Un cambio de
comportamiento debe actualizar esta lista en el mismo PR. El check
`yarn verify:feature-docs` impide integrar cambios funcionales sin esa
actualización.

## Listas

| Funcionalidad                                           | Web | MCP                             |
| ------------------------------------------------------- | --- | ------------------------------- |
| Crear listas                         | Sí  | No                              |
| Activar una lista                    | Sí  | No                              |
| Cambiar de lista                     | Sí  | No                              |
| Renombrar listas                     | Sí  | No                              |
| Eliminar listas                      | Sí  | No                              |
| Abrir una lista por slug             | Sí  | No                              |
| Compartir una lista                  | Sí  | No                              |
| Invitar miembros                     | Sí  | No                              |
| Aceptar invitaciones                 | Sí  | No                              |
| Rechazar invitaciones                | Sí  | No                              |
| Gestionar roles de propietario       | Sí  | No                              |
| Gestionar roles de editor            | Sí  | No                              |
| Gestionar roles de lector            | Sí  | No                              |
| Revocar acceso a una lista           | Sí  | No                              |
| Abandonar una lista                  | Sí  | No                              |
| Sugerir nombres de lista             | Sí  | No                              |
| Revisar nombres de lista             | Sí  | No                              |
| Sugerir la eliminación de una lista compartida | Sí | No |
| Seleccionar listas compartidas       | Sí  | No                              |
| Abandonar la selección de una lista  | Sí  | No                              |
| Consultar la lista activa            | Sí  | Sí (`get_active_shopping_list`) |

## Artículos

| Funcionalidad                                           | Web | MCP                                        |
| ------------------------------------------------------- | --- | ------------------------------------------ |
| Editar el nombre de un artículo          | Sí | No |
| Editar la cantidad de un artículo        | Sí | No |
| Editar la unidad de un artículo          | Sí | No |
| Editar los detalles de un artículo       | Sí | No |
| Editar artículos en lote                 | Sí | No |
| Agregar descripciones a artículos en lote | Sí | No |
| Desmarcar productos                      | Sí | No |
| Eliminar productos de una lista          | Sí | No |
| Mover artículos a otra lista             | Sí | No |

## Catálogo

| Funcionalidad                         | Web | MCP                      |
| ------------------------------------- | --- | ------------------------ |
| Buscar productos en una lista         | Sí  | Sí (`search_products`)   |
| Agregar productos a una lista         | Sí  | Sí (`add_item_to_list`)  |
| Autocompletar productos               | Sí  | No                       |
| Seleccionar categorías                | Sí  | No                       |
| Administrar categorías                | Sí  | No                       |
| Solicitar productos de catálogo          | Sí | No |
| Revisar solicitudes de productos         | Sí | No |

## Compra

| Funcionalidad                                                 | Web | MCP                        |
| ------------------------------------------------------------- | --- | -------------------------- |
| Marcar artículos como comprados         | Sí | Sí (`mark_item_purchased`) |
| Registrar la cantidad comprada          | Sí | Sí (`mark_item_purchased`) |
| Registrar la unidad comprada            | Sí | Sí (`mark_item_purchased`) |
| Registrar el precio de compra           | Sí | Sí (`mark_item_purchased`) |
| Registrar la descripción de la compra  | Sí | Sí (`mark_item_purchased`) |
| Completar una compra                    | Sí | No |
| Archivar el ciclo de una lista          | Sí | No |

## Carrito

| Funcionalidad                         | Web | MCP                     |
| ------------------------------------- | --- | ----------------------- |
| Ver el carrito                         | Sí  | No                      |
| Ver la lista de compras                | Sí  | No                      |
| Desmarcar artículos comprados          | Sí  | No                      |
| Editar artículos del carrito           | Sí  | No                      |
| Eliminar artículos del carrito         | Sí  | No                      |
| Agregar artículos en lote              | Sí  | Sí (`add_item_to_list`) |
| Seleccionar artículos                  | Sí  | No                      |

## Historial

| Funcionalidad                                      | Web | MCP |
| -------------------------------------------------- | --- | --- |
| Consultar el historial de compras       | Sí | No |
| Paginar el historial de compras         | Sí | No |
| Editar artículos del historial          | Sí | No |
| Repetir una compra anterior             | Sí | No |

## Sugerencias

| Funcionalidad                       | Web | MCP |
| ----------------------------------- | --- | --- |
| Enviar sugerencias de productos     | Sí  | No  |
| Enviar sugerencias de listas        | Sí  | No  |
| Revisar sugerencias de productos    | Sí  | No  |
| Revisar sugerencias de listas       | Sí  | No  |

## Cuenta

| Funcionalidad                                     | Web        | MCP                        |
| ------------------------------------------------- | ---------- | -------------------------- |
| Iniciar sesión con Google       | Sí         | Sí (OAuth MCP)             |
| Sincronizar la cuenta           | Sí         | Sí (OAuth MCP)             |
| Consultar el perfil conectado   | Sí         | Sí (`get_account_profile`) |

## Administración

| Funcionalidad                | Web        | MCP |
| ---------------------------- | ---------- | --- |
| Administrar usuarios         | Sí (admin) | No  |
| Administrar roles globales   | Sí (admin) | No  |

## Regla de actualización

Cuando un PR agrega, elimina o cambia una funcionalidad de cualquiera de estas
entidades, debe modificar la fila correspondiente o agregar una nueva. Si una
capacidad solo está disponible en la web, el MCP o ambos, debe indicarse
explícitamente en las columnas respectivas. Las funciones internas, refactors y
cambios de estilo que no alteren una capacidad observable no requieren una
nueva fila, pero el PR debe dejar intacto el inventario.
