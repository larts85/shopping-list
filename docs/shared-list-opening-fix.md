# Apertura de listas compartidas — corrección

Base: develop en 2218fb6 (PR13 integrado). Corrección e7b5e4a y Home 4d6ab6b publicados en PR14 e integrados a develop mediante 3d26df5. Incluidos en la release del 11/10/2026 hacia main.

Defectos comprobados en el código anterior:

- El modal mostraba `/logistic` como enlace manual y en el mailto, sin slug de la lista invitada.
- La invitación automática priorizaba APP_URL global; en preview podía apuntar a producción, cuyo esquema no contiene la lista ni su invitación. Con variables de Vercel disponibles, ahora usa la URL de la rama de preview; de lo contrario, la URL del deployment o el preview de develop existente. Producción conserva APP_URL.
- Tras resolver un slug válido para un miembro, cualquier error al cargar datos por Server Action se convertía en “no tienes acceso”, aunque no fuera un error de permisos. La carga del destino ahora usa el API con scope explícito y sus errores esperados.

La respuesta autenticada de compartir incluye el slug persistido; el modal construye su enlace con el origen de la página actual. La UI aclara que copiar el enlace no crea una invitación. No se crean membresías por conocer el slug: el propietario debe invitar al correo de Google y el destinatario aceptar.

Diagnóstico remoto de solo lectura: en el esquema preview_lists consultado no había invitaciones pendientes ni colaboradores. Esto explica el rechazo para una cuenta ajena a cualquiera de esas listas, pero falta el enlace y la cuenta exactos del caso reportado para atribuirle esa causa. El PR14 tiene build de preview y checks verdes. La evidencia del deployment de producción se registra en el PR de release.

Validación: 119 comprobaciones PostgreSQL/HTTP locales, incluyendo destinatario con lista propia activa, invitación por slug y scope exacto después de aceptación. 25 checks offline de entrega/islamiento por entorno. Build, TypeScript y lint pasan.

En el navegador integrado de Codex, con build de producción y base efímera local: propietario crea invitación desde UI; el campo de enlace y mailto incluyen el slug exacto; destinatario inicia con lista propia; abre el enlace, ve aceptación, acepta y carga la lista ajena con controles bloqueados para colaborador. Sesiones JWT de fixtures example.invalid suministradas por arnés temporal externo a la app; no se enviaron correos reales. Arnés y base eliminados tras la prueba. No se modificaron datos, OAuth, esquema ni configuración remotos.
