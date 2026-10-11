# Producción: login, unidades, historial y listas compartidas

El dominio es https://elcarritodelacompra.vercel.app y Vercel publica la rama main.
El error de login era MissingSecret: las cuatro variables solo estaban en Preview.
AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET y SUPABASE_PASSWORD_DB deben estar también en Production.
Los secretos se mantienen ocultos; no es necesario rotarlos. El cliente Google debe permitir
https://elcarritodelacompra.vercel.app/api/auth/callback/google. Los cambios de variables requieren un deployment nuevo.
El build ahora bloquea un deployment de producción si falta alguna variable requerida.

## Compras

- Configura la unidad por producto en Administrar → Productos: unidades, kg, g, litros o ml.
- Mi lista permite unidades del mismo tipo (kg/g o litros/ml) y cantidades positivas, incluso decimales.
- El precio al registrar una compra es por la unidad seleccionada; el total es cantidad × precio.
- Las filas compradas se modifican desde Registrar compra para actualizar sus precios coherentemente.
- Finalizar compra archiva solo los comprados en una transacción. Los pendientes siguen abiertos.
- Historial muestra registros del hogar activo, en páginas de 50, incluidos los importados.
- Los registros antiguos conservan la medida numérica original; no se les inventa una unidad física.

## Compartir

Compartir lista invita una cuenta Google por email. La persona acepta desde Mi lista y accede
al mismo hogar (lista abierta, catálogo e historial), sin copiar datos. El propietario puede quitar
el acceso en Datos. Solo el propietario invita/revoca; cada operación comprueba pertenencia.
Las cuentas ya pertenecientes pueden alternar entre hogares desde Mi lista. Se actualiza cada
15 segundos y al enfocar la ventana; no se reemplazan cambios locales pendientes.

## Validación

Lint, typecheck y build de producción. scripts/verify-shopping-updates.mjs prueba valores inválidos,
unidades incompatibles, decimales, snapshot histórico, paginación, aislamiento entre hogares,
lectura/edición compartida y revocación, usando usuarios sintéticos y limpieza propia.
La suite de hogares cubre invitación/aceptación/revocación y carreras de revocación.
La migración product_units es aditiva y ya se aplicó a ntbiypfuelktsjfceqqu; RLS y permisos permanecen cerrados al Data API.
