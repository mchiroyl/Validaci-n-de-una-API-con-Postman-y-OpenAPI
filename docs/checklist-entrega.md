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
| Estado limpio, ambiente exportable sin secretos | SETUP; archivo ambiente vacío; empaquetador | Implementado y comprobado |
| Incompatibilidad local y fallo relevante | parche real; 02-fallo-controlado; TC04 | 4 casos / 7 aserciones fallidas |
| Corrección sin debilitar contrato | 03-corregida; huellas SHA-256 | 12/12 aprobados |
| Versiones y ejecución completa | README; package-lock.json; evidencia | Verificado con Newman; Runner documentado |
| Informe con identidad, enlaces y evidencia | entrega/informe.docx; datos.json | Word con capturas originales de terminal y visor del fallo; exportar a PDF al completar revisión |
| Video <=3 minutos | enlace de Drive y guion | Pide inicio de sesión; contenido y duración no verificados |
| Acceso del docente a enlaces | docs/verificacion-enlaces.md | Repositorio público vacío; acceso al video pendiente |
| Declaración IA y revisión personal | docs/uso-ia.md | Apoyo declarado; revisión del estudiante pendiente |
| Seguridad de herramientas | evidence/security/npm-audit.json; overrides fijados | 19 → 7 entradas; cero críticas, quedan 6 altas y 1 moderada; publicación pendiente |
| GitHub Actions (opcional) | .github/workflows/validacion.yml | Configurado localmente; sin ejecución ni capturas remotas |

## Antes de Canvas

- [x] Incorporar nombre, carné y enlaces reales proporcionados en entrega/datos.json (sección opcional).
- [ ] Leer y entender el contrato y las pruebas.
- [x] Aportar capturas personales de instalación, preparación y colección en terminal (recibidas del estudiante).
- [ ] Repetir personalmente npm run verify después de los overrides y observar también el fallo controlado.
- [ ] Confirmar TC01..TC12 en estado limpio y que TC04 falla con el defecto.
- [ ] Revisar o grabar el video, con duración <=180 segundos.
- [ ] Publicar repositorio y video; verificar acceso del docente.
- [ ] Resolver los avisos restantes de dependencias; publicación no equivale a auditoría limpia.
- [ ] Ejecutar Actions y adjuntar captura real, si se mantiene esta extensión opcional.
- [ ] Completar declaración de verificaciones personales sin inventarlas.
- [ ] Revisar Word, exportar el PDF final.
- [ ] Revisar que PDF y archivos públicos y capturas no contengan sesiones ni datos reales.
