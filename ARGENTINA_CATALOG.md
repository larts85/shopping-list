# Unidades y catálogo de compras

Los tickets distinguen la unidad de venta del contenido del envase. Coto muestra banana,
cerdo y tomate con cantidades decimales por kg; El Puente muestra queso sardo y Mar del Plata
al peso. Las latas de 473 ml, potes de 290 g y bobinas de filamento de 1 kg se venden por unidad.

`data/argentina-catalog.json` contiene 141 referencias normalizadas en 16 categorías.
Incluye alimentos, dietética, limpieza, aseo, bebés e insumos habituales del hogar.
No contiene comprobantes, identidades, direcciones, medios de pago ni precios.
Los importes históricos no se infieren ni se reimportan desde los tickets.

Los productos genéricos usan kg/g, litros/ml o unidades según su tipo. Los paquetes
identificados mantienen el tamaño en el nombre y se cuentan por unidad.
Administrar y Agregar muestran la unidad. La creación sugiere una unidad por nombre/categoría,
editable por el usuario; una elección explícita siempre tiene prioridad, también en el servidor.

La edición conserva unidades compatibles ya elegidas (ej. 500 g aunque el producto use kg).
Si cambia la dimensión de venta, una cantidad pendiente debe reingresarse.
Las filas compradas congelan su unidad anterior; el historial conserva sus snapshots.

El actualizador es específico para un hogar y no marca los nuevos productos para comprar.
Se ejecuta primero sin `--apply` para revisar el resultado:

```sh
node --env-file=.env scripts/update-argentina-catalog.mjs --household UUID
node --env-file=.env scripts/update-argentina-catalog.mjs --household UUID --apply
```

Aplica todo en una transacción con bloqueo del hogar, respaldo privado temporal y verificaciones
sobre historial, filas compradas, selecciones y productos preexistentes. Solo corrige el antiguo
valor `un`; respeta unidades físicas configuradas por el usuario. Una repetición no duplica registros.

Validación: lint, typecheck, build, casos de inferencia con envases/capacidades de equipos y
suite HTTP de compras ampliada para cubrir defaults, unidades explícitas y snapshots antiguos.
