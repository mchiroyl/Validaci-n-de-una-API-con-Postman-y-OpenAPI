# Validación de una API con Postman y OpenAPI

Proyecto académico de una API local de pedidos para comprobar reglas funcionales y contratos mediante una colección automatizada de Postman. Utiliza Node.js, datos sintéticos y dos usuarios de prueba. No requiere una interfaz gráfica ni despliegue público.

## Funcionalidad y cobertura

La API permite listar pedidos con paginación, crear y consultar pedidos protegidos y confirmar un pedido mediante una operación idempotente.

| Operación | Comportamiento |
| --- | --- |
| `GET /orders` | Lista únicamente los pedidos del usuario autenticado; acepta `page` y `limit`. |
| `POST /orders` | Crea un borrador. Acepta `product: "CUADERNO"` y `quantity` entera entre 1 y 10; calcula el total a Q25 por unidad. |
| `GET /orders/{id}` | Consulta un pedido propio; rechaza credenciales ausentes o inválidas y acceso a pedidos ajenos. |
| `PUT /orders/{id}/confirmation` | Confirma el pedido una sola vez. Repetir conserva fecha, contador e importe persistidos. |
| `DELETE /orders/{id}` | Elimina un pedido propio para limpiar los datos de la prueba. |

La matriz contiene **12 situaciones distintas, TC01–TC12**, con operación, riesgo, precondiciones, datos, resultado esperado, aserciones y limpieza. Cubre paginación, creación y consulta posterior, entradas inválidas, campos obligatorios, autenticación, permisos, recurso inexistente, confirmación e idempotencia. POST no se considera idempotente.

## Requisitos y versiones verificadas

- Node.js 22.19.0 o superior; ejecución local verificada con Node.js **24.19.0** y npm **11.17.0**.
- Newman **6.2.2**, Postman Runtime **7.39.1** y Sandbox **4.7.1**.
- Swagger Parser **13.1.0**, Ajv **8.20.0** y ajv-formats **3.0.1**.
- Contrato **OpenAPI 3.1.0**, JSON Schema **2020-12** y colección **Postman Collection v2.1.0**.
- Postman Desktop compatible con Collection v2.1 para usar Collection Runner. Su versión no se ha registrado; la ejecución automatizada comprobada corresponde a Newman.

`package-lock.json` fija las versiones. La API utiliza módulos nativos de Node.js; las dependencias npm se emplean en las herramientas de validación.

## Preparación e inicio

Desde la carpeta del proyecto, con la API detenida:

```powershell
npm ci
npm run prepare:data
npm start
```

La API escucha en `http://127.0.0.1:3000`. Mantenga abierta esa terminal.

La preparación crea tres pedidos de `usuario_a`, uno de `usuario_b` y sesiones aleatorias en `.local/`, excluido de Git. Los identificadores se generan de nuevo; las pruebas no dependen de IDs de ejecuciones anteriores.

La solicitud **SETUP** reinicia los datos en memoria y disco y obtiene las sesiones temporales para la corrida. El endpoint `POST /__demo/prepare` es exclusivo de esta demostración local y no representa autenticación de producción. **CLEANUP** elimina el pedido creado, comprueba su ausencia y borra las variables temporales.

## Ejecución en Postman

1. Inicie la API e importe `postman/pedidos.postman_collection.json` y `postman/local.postman_environment.json`.
2. Seleccione el ambiente **Pedidos local - sin secretos**; compruebe `baseUrl = http://127.0.0.1:3000`.
3. Abra **Run** en la colección. Incluya las **14 solicitudes en orden**, desde SETUP hasta CLEANUP, con **una iteración** y sin archivo de datos.
4. Desactive **Keep variable values**. Evite guardar o compartir el cuerpo de SETUP, que contiene sesiones temporales.
5. Ejecute la colección y compruebe los IDs TC01–TC12 y las aserciones. Los estados 400, 401, 403 y 404 esperados corresponden a pruebas negativas aprobadas.

Si la importación muestra **Secrets Detected** para el literal exacto `Bearer invalid-demo-session` de TC08, use **Action → Override** únicamente para ese elemento. Es un dato ficticio destinado a comprobar el rechazo con 401. Eliminarlo cambiaría la prueba. Esta excepción no aplica a credenciales reales ni a otros valores detectados.

Una captura de la colección importada acredita su configuración. Para evidenciar ejecución, debe mostrar el resumen del Runner y los resultados de las pruebas.

## Ejecución automatizada local

Con la API iniciada, ejecute en otra terminal:

```powershell
npm run test:collection
```

El comando ejecuta la colección con Newman, valida los cuerpos observados con Ajv y guarda informes sanitizados en `evidence/manual.json`, `.txt` y `.html`. Omite las cabeceras de autenticación y el cuerpo de SETUP. Devuelve código 1 si falta un caso, falla una aserción o se detecta una respuesta incompatible.

También puede ejecutar la colección directamente:

```powershell
npx --no-install newman run postman/pedidos.postman_collection.json -e postman/local.postman_environment.json --reporters cli
```

Mantenga la ejecución completa para llegar a CLEANUP; no suprima el código de fallo ni exporte ambientes o reportes crudos que contengan sesiones.

## Incompatibilidad controlada y corrección

```powershell
npm run evidence
```

Este comando inicia sus propios servidores locales temporales y ejecuta tres corridas: base, defecto y corrección. El defecto modifica realmente `src/api.mjs` para devolver `total` como texto en `GET /orders/{id}`, mientras OpenAPI exige un número. TC04 detecta el cambio aunque el estado HTTP sea 200.

El proceso conserva el parche, restaura la fuente y repite desde datos limpios. Verifica que el contrato permanezca idéntico. La corrida defectuosa devuelve 1; el comando completo devuelve 0 únicamente cuando comprueba el fallo esperado y la corrección. No edite simultáneamente la fuente durante esta demostración.

Para mostrarlo en Postman:

1. Detenga la API; ejecute `npm run defect:on` y después `npm start`.
2. Ejecute la colección completa y observe el fallo de esquema de TC04.
3. Detenga la API; ejecute `npm run defect:off` y después `npm start`.
4. Repita la colección desde SETUP y compruebe los doce casos aprobados.

La corrección se realiza en la API, sin debilitar el contrato ni las aserciones.

## Resultados registrados

Ejecuciones locales del **3 de octubre de 2026**, con fechas UTC conservadas en los informes:

| Corrida | Casos | Aprobados | Fallidos | Aserciones fallidas | Salida |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base | 12 | 12 | 0 | 0 de 91 | 0 |
| Defecto controlado | 12 | 8 | 4 | 7 de 91 | 1 |
| Corregida | 12 | 12 | 0 | 0 de 91 | 0 |

Son 14 solicitudes principales: SETUP, doce casos y CLEANUP. Las lecturas auxiliares completan 25 peticiones HTTP; no cuentan como casos adicionales. TC12 comprueba el efecto final mediante consultas posteriores: contador de confirmación igual a 1, fecha e importe conservados y ausencia de pedidos adicionales.

Para regenerar artefactos y repetir la verificación completa:

```powershell
npm run verify
```

## Archivos del proyecto

| Ruta | Contenido |
| --- | --- |
| `src/` | API y servidor local. |
| `openapi/openapi.json` | Contrato con parámetros, seguridad, cuerpos y respuestas de éxito y error. |
| `docs/matriz.md` y `docs/matriz.csv` | Matriz de doce casos. |
| `postman/` | Colección y ambiente exportable sin sesiones. |
| `scripts/` y `tests/` | Preparación, generación, ejecución y pruebas de integración. |
| `evidence/` | Informes sanitizados, parche del defecto y capturas reales. |
| `.github/workflows/validacion.yml` | Workflow preparado para verificación funcional y auditoría de dependencias. |

## Seguridad y límites

La API escucha exclusivamente en loopback, utiliza datos sintéticos y verifica la propiedad de los pedidos. No está diseñada para exposición pública ni uso productivo. No se publican `.local/`, `.env*`, `node_modules/`, sesiones, documentos de identificación ni archivos privados de entrega.

La última auditoría registrada de las herramientas de desarrollo contiene **7 entradas: 6 altas y 1 moderada; ninguna crítica**. Persisten avisos asociados a Faker, csv-parse y node-forge en el árbol de Newman. Las entradas incluyen propagación a paquetes consumidores. Los overrides redujeron los avisos originales, pero no los eliminaron; las pruebas funcionales aprobadas no demuestran ausencia de vulnerabilidades. No se recomienda aplicar `npm audit fix --force` sin evaluar compatibilidad.

Postman verifica estados, estructura, reglas y efectos. Swagger Parser valida el documento OpenAPI y Ajv 2020 valida los cuerpos observados según operación y estado. Esto no constituye validación integral de todo el tráfico OpenAPI. No se cubren carga, autenticación productiva ni todos los casos límite.

GitHub Actions todavía no tiene una ejecución verificada de este proyecto. El workflow preparado bloquea avisos de auditoría moderados o superiores; no se presenta como aprobado.

## Uso de inteligencia artificial

Se utilizó Codex como apoyo para diseñar la API, proponer casos, escribir scripts y documentación y ejecutar verificaciones locales. Los resultados citados proceden de ejecuciones reales. El estudiante debe comprender el código y las pruebas y declarar las comprobaciones que realizó personalmente. No se atribuyen a una persona revisiones que no haya confirmado.

La identificación, el enlace al video y el informe académico se entregan por separado en Canvas. No forman parte de la documentación técnica pública.

## Referencias

- [OpenAPI 3.1.0](https://spec.openapis.org/oas/v3.1.0.html).
- [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs/).
- [Newman](https://learning.postman.com/docs/reference/newman-cli/installing-running-newman/).
