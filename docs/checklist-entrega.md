# Revisión contra la rúbrica

| Requisito | Archivo / comprobación local | Estado |
| --- | --- | --- |
| API con listado paginado, creación y consulta protegidas | src/api.mjs; tests/api.test.mjs | Ejecutado localmente |
| Dos usuarios y permisos | SETUP, TC01, TC09 | Ejecutado |
| Operación idempotente y efecto final | PUT confirmation; TC11 y TC12; contador/fecha/listado | Ejecutado |
| OpenAPI 3.1 con parámetros, seguridad, cuerpos y errores | openapi/openapi.json; Swagger Parser | Validado |
| Al menos 12 casos distintos y ocho columnas | docs/matriz.md y matriz.csv | 12 situaciones |
| IDs en solicitudes y pruebas Postman | colección v2.1 | TC01..TC12 |
| Válidos y verificación posterior | TC03, TC04, TC11 | Ejecutado |
| Inválidos y obligatorios | TC02, TC05, TC06 | Ejecutado |
| Sin credenciales / inválidas | TC07, TC08 | Ejecutado |
| Recurso ajeno / inexistente | TC09, TC10 | Ejecutado |
| Esquemas de éxito / error | Scripts Postman y Ajv 2020 | Ejecutado; alcance documentado |
| Estado limpio, ambiente exportable sin secretos | SETUP; archivo ambiente vacío; revisión de entrega | Implementado y comprobado |
| Incompatibilidad local y fallo relevante | parche real; 02-fallo-controlado; TC04 | 4 casos / 7 aserciones fallidas |
| Corrección sin debilitar contrato | 03-corregida; huellas SHA-256 | 12/12 aprobados |
| Versiones y ejecución completa | README; package-lock.json; evidencia | Verificado con Newman y Postman CLI 1.69.0; Runner documentado |
| Informe con identidad, enlaces y evidencia | entrega/informe.docx; datos.json | Word con capturas originales de terminal y visor del fallo; exportar a PDF al completar revisión |
| Video <=3 minutos | enlace de Drive y guion | Pide inicio de sesión; contenido y duración no verificados |
| Acceso del docente a enlaces | docs/verificacion-enlaces.md | Repositorio público con proyecto publicado; acceso al video pendiente |
| Declaración IA y revisión personal | docs/uso-ia.md | Apoyo declarado; revisión del estudiante pendiente |
| Seguridad de herramientas | evidence/security/npm-audit.json; overrides fijados | 19 → 7 entradas; cero críticas, quedan 6 altas y 1 moderada; auditoría fallida |
| GitHub Actions (opcional) | .github/workflows/validacion.yml | Ejecutado: API y contrato aprobado; seguridad fallida. Capturas Actions incluidas en Word |

## Antes de Canvas

- [x] Incorporar nombre, carné y enlaces reales proporcionados en entrega/datos.json (sección opcional).
- [ ] Leer y entender el contrato y las pruebas.
- [x] Aportar capturas personales de instalación, preparación y colección en terminal (recibidas del estudiante).
- [x] Recibir captura personal de npm run evidence con base, fallo controlado y corrección.
- [ ] Completar declaración personal de lo comprendido y comprobado.
- [x] Confirmar por ejecución automatizada TC01..TC12 y fallo de TC04 con el defecto.
- [ ] Revisar o grabar el video, con duración <=180 segundos.
- [x] Publicar código, contrato, colección, matriz y evidencia en el repositorio público.
- [ ] Verificar acceso del docente al video y confirmar contenido y duración.
- [ ] Resolver los avisos restantes de dependencias; publicación no equivale a auditoría limpia.
- [x] Ejecutar Actions y adjuntar capturas reales de aprobación funcional y fallo de auditoría.
- [ ] Completar declaración de verificaciones personales sin inventarlas.
- [ ] Revisar Word, exportar el PDF final.
- [ ] Revisar que PDF y archivos públicos y capturas no contengan sesiones ni datos reales.

## Capturas seleccionadas

El Word conserva evidencia local de permisos, resumen, idempotencia, defecto y corrección; dos vistas de configuración en Postman; y dos capturas de Actions (trabajo funcional aprobado y auditoría fallida). Las vistas repetidas se conservan en evidence/capturas/ sin alargar el informe. Postman CLI 1.69.0 ejecutó los doce casos con 91 aserciones y cero fallos, cumpliendo la alternativa de ejecución de la rúbrica. Se incluye captura del visor del registro real de CLI. Las capturas de Postman Desktop solo muestran configuración; no se les atribuye ejecución.

- [x] Ejecutar y registrar Postman CLI 1.69.0: 12 casos, 25 peticiones, 91 aserciones, salida 0.
- [x] Repetir pruebas desde limpio el 4 de octubre de 2026 y capturar fallo y corrección actuales.
- [ ] Confirmar video con acceso del docente: Chrome no está disponible para automatización en esta sesión.
