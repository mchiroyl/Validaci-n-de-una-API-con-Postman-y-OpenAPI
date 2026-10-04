# Validación de una API con Postman y OpenAPI

Proyecto local de pedidos, individual, con evidencia ejecutada. No requiere interfaz gráfica, base de datos externa, cuenta de Postman ni despliegue público. La API utiliza Node.js nativo y datos sintéticos. Importes en quetzales: un CUADERNO cuesta Q25.

## Resultado observado

Ejecución registrada el **3 de octubre de 2026**, zona America/Guatemala (los informes conservan UTC). Cada corrida completa ejecuta **12 casos distintos TC01..TC12**, **14 solicitudes principales** (incluye SETUP y CLEANUP), **24 interacciones de pedidos** contando lecturas auxiliares y **91 aserciones** contando preparación y limpieza.

| Corrida | Casos ejecutados | Aprobados | Fallidos | Aserciones fallidas | Código |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base | 12 | 12 | 0 | 0 | 0 |
| Defecto controlado | 12 | 8 | 4 | 7 | 1 |
| Corregida desde limpio | 12 | 12 | 0 | 0 | 0 |

Los resultados provienen de Newman, ejecutando la colección exportada de Postman. Los informes verifican los doce IDs en orden; no cuentan las solicitudes auxiliares como casos extra. Las lecturas con `pm.sendRequest` también se ejecutan, y sus aserciones llevan el ID del caso correspondiente.

## Requisitos y versiones

- Node.js **22.19.0 o superior**; ejecución verificada con **24.19.0**, npm **11.17.0**.
- Newman **6.2.2**; Postman Runtime **7.39.1**, Sandbox **4.7.1** (dependencias de Newman).
- Ajv **8.20.0**, ajv-formats **3.0.1**, Swagger Parser **13.1.0**.
- Colección **Postman Collection v2.1.0**. Contrato **OpenAPI 3.1.0**, JSON Schema **2020-12**.
- Windows/PowerShell usado para la evidencia. Los comandos npm y el servidor también son portables.
- Collection Runner: Postman Desktop que admita colección v2.1. Se documenta su importación; no se afirma una ejecución manual en una versión de Postman Desktop no verificada.

`package-lock.json` fija las dependencias. La API no necesita paquetes externos en ejecución. Las dependencias de desarrollo de Newman incluyen paquetes antiguos con avisos de npm; no se afirma que el proyecto tenga una auditoría de dependencias limpia. Se usan para la colección local controlada.

## Instalación y datos reproducibles

Abra la terminal en la carpeta del proyecto:

```powershell
npm ci
npm run prepare:data
npm start
```

El servicio escucha exclusivamente en `http://127.0.0.1:3000`. Mantenga abierta esa terminal. Si necesita cambiar el puerto en PowerShell, use `$env:PORT = '3001'` antes de `npm start` y cambie `baseUrl` en el ambiente de Postman; el runner npm estándar utiliza 3000. Para volver al puerto predeterminado: `Remove-Item Env:PORT -ErrorAction SilentlyContinue`.

`prepare:data` crea `.local/state.json`: tres pedidos de `usuario_a`, uno de `usuario_b` y sesiones aleatorias. Ejecútelo con la API detenida. No hay contraseñas ni usuarios reales. IDs UUID y tokens se generan en cada preparación. `.local/` está ignorado y excluido del ZIP.

La primera solicitud de la colección, **SETUP**, llama `POST /__demo/prepare`: reinicia los fixtures de la API en memoria y disco y recibe las sesiones temporales. Este mecanismo existe únicamente para la demo loopback; no constituye un inicio de sesión productivo. Rechaza solicitudes con `Origin`. Cada corrida parte de un estado limpio y obtiene sus propios IDs; nunca requiere IDs de una corrida anterior.

El ambiente de ejemplo tiene `baseUrl` y variables de sesión vacías. SETUP las llena temporalmente; CLEANUP elimina el pedido creado, verifica que devuelve 404 y que el listado vuelve a tres propios, y borra las variables. Si se interrumpe una corrida, vuelva a ejecutar completa desde SETUP.

## Ejecutar la colección completa

### Opción A: Collection Runner (ruta requerida para la entrega)

**Aviso al importar: Secrets Detected.** TC08 contiene deliberadamente `Authorization: Bearer invalid-demo-session`, una credencial ficticia que debe ser rechazada con 401. Si el aviso apunta exactamente a ese literal en TC08 (`requests.8.headerData.0.value`), seleccione **Action → Override** únicamente para ese elemento y continúe la importación. No elija Remove: eliminarlo convertiría TC08 en otra prueba sin credenciales. No cambie el literal por una sesión válida ni desactive el detector globalmente. Si el valor detectado es diferente, detenga la importación y compruébelo; esta excepción no aplica a tokens reales.

1. Con la API iniciada, importe `postman/pedidos.postman_collection.json` y `postman/local.postman_environment.json` en Postman Desktop.
2. Seleccione el ambiente **Pedidos local - sin secretos**.
3. Abra la colección, seleccione **Run**, incluya **las 14 solicitudes** y mantenga su orden. Configure **1 iteración**, sin archivo de datos.
4. Desactive **Keep variable values** / persistencia de variables y el guardado de cuerpos de respuesta si su versión ofrece esa opción. Evite abrir o capturar el cuerpo de SETUP, que contiene sesiones efímeras.
5. Ejecute la colección completa. Compruebe los doce IDs TC01..TC12 aprobados. SETUP y CLEANUP se muestran aparte. Los 400, 401, 403 y 404 esperados son pruebas negativas aprobadas, no errores del runner.
6. Revise TC05 o TC09 como prueba negativa: el servidor rechaza el intento y la lectura posterior confirma que no hubo efecto.

La colección contiene sus esquemas, por lo que no depende del acceso al disco ni de otro archivo durante el Runner. Si cambió el contrato fuente, regenere y vuelva a importar la colección.

### Opción B: ejecución local automatizada verificada

Con la API iniciada en 3000, en otra terminal:

```powershell
npm run test:collection
```

Ejecuta la colección con Newman y valida adicionalmente cuerpos con Ajv. Guarda `evidence/manual.txt`, `.json` y `.html`, sin cabeceras de autenticación ni respuesta de SETUP. Código 0 si todo cumple; código 1 si falta un ID, falla una aserción, hay fallo del runtime o un cuerpo contradice el esquema.

También puede ejecutar Newman directamente:

```powershell
npx --no-install newman run postman/pedidos.postman_collection.json -e postman/local.postman_environment.json --reporters cli
```

No use `--bail`: debe llegar a la limpieza incluso si una aserción falla. No use `--suppress-exit-code`. No exporte reportes JSON crudos ni ambientes con valores runtime: pueden contener sesiones. El wrapper npm guarda únicamente la evidencia sanitizada.

## Demostrar incompatibilidad, corregir y repetir

El defecto real cambia una línea de `src/api.mjs`: GET /orders/{id} serializa `total` como `String(order.total)`. El contrato sigue exigiendo `type: number`. Un HTTP 200 no basta: **TC04 | esquema Order** falla y la regla de precio también detecta la diferencia. Al afectar consultas posteriores, TC09, TC11 y TC12 también fallan. El parche se conserva en `evidence/defecto-controlado.patch`.

### Demostración automática (sin iniciar la API aparte)

```powershell
npm run evidence
```

Inicia servidores temporales loopback en puertos disponibles, ejecuta base, modifica realmente la fuente local, ejecuta el fallo, restaura la fuente y repite desde datos limpios. Exige fallo de esquema TC04 y corrida corregida de doce casos. Comprueba que OpenAPI permanece idéntico y que el SHA-256 de la fuente corregida coincide con el original. Un `finally` restaura la fuente si ocurre un problema. No use edición simultánea de `src/api.mjs` mientras corre este comando.

El comando completo termina en 0 cuando la demostración es válida: la **corrida defectuosa interna devuelve 1**, como registra su informe. No se oculta el fallo; el orquestador lo exige como parte del experimento.

### Demostración manual en Postman

1. Detenga la API con Ctrl+C.
2. Ejecute `npm run defect:on`, luego `npm start`.
3. Corra completa la colección en Runner y muestre TC04 fallando por tipo de `total`.
4. Detenga la API; ejecute `npm run defect:off`, luego `npm start`.
5. Corra otra vez toda la colección desde SETUP: deben pasar los doce casos.

No cambie OpenAPI ni las aserciones para resolverlo. Reiniciar el servidor es necesario para cargar la fuente modificada.

## Reglas y riesgos

- GET /orders filtra por propietario; `page` 1..1000000 y `limit` 1..20. Página vacía conserva total y metadatos; se rechazan consultas desconocidas, duplicadas o inválidas.
- POST /orders acepta solo `product=CUADERNO` y `quantity` entera 1..10. El servidor asigna propietario, calcula el total y crea un borrador nuevo. **POST no es idempotente**.
- GET /orders/{id} requiere sesión. 401 sin sesión válida, 403 si pertenece a otro usuario, 404 si no existe, 400 si el ID es inválido.
- PUT /orders/{id}/confirmation no acepta cuerpo. La primera confirmación asigna fecha y contador 1, persistidos en disco. Repetir conserva contador, fecha, importe y conjunto de pedidos. TC12 lo comprueba mediante lecturas posteriores; no se basa solo en respuestas idénticas ni en un encabezado de idempotencia.
- DELETE /orders/{id} se usa para limpiar el recurso creado y exige propiedad.

## Contrato y límites de validación

`openapi/openapi.json` documenta parámetros, seguridad Bearer, cuerpos y respuestas de éxito/error. `scripts/contract.mjs` es su fuente de autoría; `npm run generate` materializa el contrato y deriva los esquemas de la colección sin quitar restricciones.

Se distinguen tres niveles:

1. **Postman:** estado HTTP, tipo de contenido, estructura JSON, códigos de error, reglas funcionales y efectos observados. Los esquemas son un subconjunto sencillo compatible con el sandbox, derivados del contrato 3.1.
2. **Swagger Parser:** validación estructural del documento OpenAPI y resolución de referencias.
3. **Ajv 2020:** validación de los cuerpos de respuesta realmente observados contra el esquema de la operación y estado del contrato original, incluyendo los errores específicos.

**Esto no es validación completa de OpenAPI** de todo el tráfico: no valida automáticamente todas las peticiones, restricciones de todos los parámetros, todas las cabeceras ni todas las rutas posibles. La colección prueba los casos definidos. No cubre carga, concurrencia entre procesos, recuperación ante fallo de disco, autenticación de producción, expiración de sesiones ni todos los valores límite. Las pruebas de integración adicionales verifican reinicio, consultas inválidas y límites de entrada, pero no aumentan los doce casos de la matriz.

## Evidencia y archivos

- `docs/matriz.md` y `.csv`: doce casos con ID, operación, riesgo, precondiciones, datos, resultados, aserciones y limpieza.
- `postman/`: colección exportable y ambiente sin secretos.
- `evidence/01-base.*`, `02-fallo-controlado.*`, `03-corregida.*`: informes reales legibles y respuestas de pedidos sanitizadas; `.html` se puede abrir en navegador.
- `evidence/resumen.json`: conteos y huella del contrato.
- `entrega/informe.docx`: informe Word editable con identificación, enlaces, capturas originales de terminal y evidencia del fallo y corrección; completar revisión y exportar a PDF desde Word.
- `evidence/capturas/`: capturas del visor de informes reales de Newman, con base, prueba negativa, incompatibilidad y corrección.
- `docs/guion-video.md`: guion de máximo 3 minutos.
- `docs/uso-ia.md`: apoyo de IA, ejecución realizada por el agente y comprobaciones personales pendientes.
- `docs/checklist-entrega.md`: revisión contra la rúbrica.

## Verificación completa y paquete

```powershell
npm run verify
npm run delivery
```

`verify` regenera artefactos, ejecuta integración y repite las tres corridas reales. `delivery` verifica consistencia, ausencia de sesiones en los archivos públicos y genera `entrega/proyecto-pedidos.zip` sin `node_modules`, `.local`, `.git`, temporales ni el propio ZIP. Los informes guardan fingerprints públicos SHA-256; no son tokens.

El Word es el documento principal solicitado. Puede editarlo y elegir Archivo > Guardar como > PDF al completar la entrega. El PDF anterior queda como referencia de la primera entrega y no se incluye en el ZIP actualizado. Para regenerar el Word use `docs/artefactos.md`; si repite las pruebas, actualice también las capturas antes de atribuirles una corrida nueva. Se conserva el enlace del video proporcionado por el usuario; no se generó un video nuevo. Consulte `docs/verificacion-enlaces.md`: el repositorio era público y vacío al comprobarlo; el video pidió iniciar sesión y no permitió verificar duración ni contenido.

## Completar Canvas sin inventar información

La publicación está pendiente de resolver las vulnerabilidades restantes, conforme a la condición del usuario. La auditoría completa está en `evidence/security/npm-audit.json`: se redujeron 19 entradas a 7 (6 altas y 1 moderada; cero críticas). Tres causas permanecen en dependencias de desarrollo de Newman: Faker 5.5.3, csv-parse 4.16.3 y node-forge 1.4.0. Las entradas incluyen propagación a consumidores; no son siete fallos independientes. No se recomienda `npm audit fix --force`: las versiones sugeridas no garantizan compatibilidad. La API usa módulos nativos y solo escucha en loopback; esto limita exposición, pero no elimina los avisos de sus herramientas.

El workflow `.github/workflows/validacion.yml` está preparado, con permisos de lectura, acciones fijadas a SHA y carga exclusiva de informes sanitizados. **No se ejecutó en GitHub Actions**. Su auditoría bloqueará la aprobación mientras existan avisos moderados o superiores. No hay captura de Actions porque todavía no existe una ejecución remota verificada.

## Archivos públicos y entrega privada

El repositorio debe incluir código `src/`, scripts, pruebas, `package.json` y lock, OpenAPI, colección, ambiente vacío, matriz, documentación técnica, workflow e informes/capturas sanitizados. Consulte `docs/publicacion.md` para la selección revisada.

No publique `node_modules/`, `.local/`, `.env*`, temporales, registros crudos de Postman, ambientes con sesiones, documentos de identificación, ZIP ni carpetas extraídas del ZIP. `entrega/` y los DOCX de la raíz quedan ignorados: el Word, identidad, enlace de video y ZIP se conservan localmente para Canvas. Por eso esos archivos no estarán disponibles en un clon público. El README público explica cómo ejecutar y verificar la API; no debe incluir nombre completo, carné, contraseñas, tokens o una afirmación de auditoría limpia que no esté comprobada.

`entrega/datos.json` ya contiene la identificación y enlaces proporcionados. Sección es opcional. No coloque contraseñas ni tokens. Actualice los datos en el Word antes de exportarlo a PDF.

Publique los archivos del repositorio excluyendo lo ignorado; revise el video compartido o grabe una explicación propia siguiendo el guion. Compruebe ambos enlaces en una ventana sin iniciar sesión o con una cuenta que tenga los mismos permisos del docente. No declare como realizada una verificación personal que no hizo. Adjunte el PDF final y opcionalmente el ZIP después de comprobar que el repositorio contiene los archivos y el docente puede reproducir el video.

## Fuentes de documentación consultadas

- [OpenAPI 3.1.0](https://spec.openapis.org/oas/v3.1.0.html): contrato y semántica de esquemas.
- [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs/): ejecución de colección y variables.
- [pm.sendRequest](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-send-request/): lecturas posteriores asíncronas.
- [Newman](https://learning.postman.com/docs/reference/newman-cli/installing-running-newman/): ejecución local de colección y ambiente.

Documentación Postman consultada mediante Context7 CLI. El funcionamiento local se verificó por ejecución, no solo por generación de archivos.
# Validaci-n-de-una-API-con-Postman-y-OpenAPI
