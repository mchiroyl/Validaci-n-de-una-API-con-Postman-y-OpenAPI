# Guion de video - objetivo 2:35, máximo 3:00

Use este guion para revisar el video proporcionado o realizar una grabación propia. No se creó un video local nuevo ni se verificó la duración del enlace de Drive, que pidió iniciar sesión. No muestre SETUP ni el archivo .local/state.json.

| Tiempo aproximado | Pantalla | Explicación |
| --- | --- | --- |
| 0:00-0:25 | API, operaciones y matriz | API local de pedidos con dos usuarios, precio calculado por servidor y listado filtrado por propietario. Riesgos: acceso horizontal, datos inválidos y efectos duplicados. |
| 0:25-0:55 | Collection Runner o informe 01-base | Colección completa: 12 casos, más preparación y limpieza. Cada ejecución genera sus IDs. Se revisan estado, cuerpo, reglas y efectos. Mostrar 12 aprobados y 91 aserciones totales. |
| 0:55-1:20 | TC09 y sus lecturas | A intenta acceder y confirmar un pedido B: 403 esperado. La lectura autorizada B conserva draft y contador 0. Una prueba negativa aprobada demuestra que el rechazo ocurre y no cambia el recurso. |
| 1:20-1:50 | Parche y fallo TC04 en 02-fallo-controlado | OpenAPI exige total numérico; el defecto local devuelve texto. El 200 por sí solo no detectaría esto. TC04 falla por esquema, y también fallan verificaciones posteriores. El contrato permanece igual. |
| 1:50-2:20 | Informe 03-corregida y TC12 | Restauración de la fuente, preparación limpia y 12/12 aprobados. PUT repetido deja contador 1, misma fecha, Q50 y cuatro pedidos propios: se verifica el efecto persistido, no solo respuestas iguales. |
| 2:20-2:45 | Alcance y declaración IA | Validación del cuerpo y reglas seleccionadas, no validación integral OpenAPI. No cubre carga ni autenticación productiva. IA apoyó diseño y scripts; describa únicamente lo que usted verificó personalmente. |

Priorice explicar por qué esas aserciones demuestran cada riesgo. No recorra todos los archivos ni declare comprobaciones personales pendientes. Al publicar, agregue el enlace real a entrega/datos.json y regenere el PDF.
