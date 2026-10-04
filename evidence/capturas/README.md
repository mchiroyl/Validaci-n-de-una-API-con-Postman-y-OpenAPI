# Capturas de evidencia

`postman/01.png` a `postman/07.png` son capturas originales aportadas por el estudiante de la documentación de la colección importada en Postman. No muestran resultados del Collection Runner y tienen No environment seleccionado. Se incorporan al Word las imágenes 01 y 07 como apoyo de configuración; las restantes se conservan para evitar repetir vistas en el informe breve. No se observan valores de sesiones reales en estas siete imágenes.

`terminal/01.png` a `terminal/07.png` son siete originales aportadas por el estudiante. Muestran instalación y API, TC01..TC12, lecturas posteriores, limpieza y resumen de 91 aserciones. No se modificaron. La instalación de terminal/01.png muestra 19 avisos anteriores a los overrides; la auditoría actual registra 7 entradas, no cero. Las capturas de terminal son anteriores a esa actualización y no se atribuyen a la ejecución posterior.

GitHub Actions está pendiente de publicación y ejecución real; no existe una captura de Actions y no se creó una imagen simulada.

Las cuatro imágenes JPG fueron tomadas en el navegador integrado del visor local de `scripts/capture_server.mjs`. El visor lee los informes JSON reales sanitizados de Newman; no crea resultados ni se presenta como interfaz de Postman Desktop.

- `01-base.jpg`: los doce IDs, estados HTTP y resultados de la corrida limpia.
- `02-fallo-controlado.jpg`: cambio real de serialización, respuesta `total: "50"` y fallo del esquema TC04.
- `03-corregida.jpg`: resumen de doce casos aprobados; extracto TC04, TC11 y TC12 y efecto final persistido.
- `04-prueba-negativa.jpg`: GET y PUT ajenos rechazados con 403 y lectura autorizada B sin efectos.

Las capturas omiten sesiones y cabeceras Authorization. Los identificadores ajenos se muestran como `{foreignId}` para centrar la evidencia en permisos, y no son necesarios para reproducir una corrida. SETUP genera IDs nuevos.

Están incorporadas en `entrega/informe.docx`, con pies de figura y explicación. Si repite las pruebas y desea sustituir la evidencia del informe, vuelva a capturar los resultados de esa nueva corrida; no reutilice las imágenes para afirmar una ejecución distinta.
