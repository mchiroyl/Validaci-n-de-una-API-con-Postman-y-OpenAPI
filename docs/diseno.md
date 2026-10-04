# Diseño y decisiones

Objetivo: demostrar con ejecuciones reales el cumplimiento funcional y de cuerpos de respuesta de una API local de pedidos, conforme a la rúbrica suministrada.

API HTTP con Node.js nativo, almacenamiento JSON local y dos usuarios sintéticos. Servidor limitado a 127.0.0.1; sin interfaz ni despliegue. Cada preparación genera tokens aleatorios, nunca exportados. Un archivo local ignorado permite obtener sesiones de demostración; no existe autenticación productiva ni datos personales.

Pedidos: producto fijo CUADERNO (Q25), cantidad entera 1..10, importe calculado por servidor, propietario inmutable. GET /orders lista solo pedidos propios, con page >=1 y limit 1..20. POST crea un borrador. GET /orders/{id} devuelve el pedido si pertenece al usuario; 403 para recurso ajeno y 404 para UUID desconocido. PUT /orders/{id}/confirmation confirma una sola vez; un contador y fecha persistidos permiten verificar su efecto final después de repetir el PUT.

Contrato OpenAPI 3.1.0 en JSON (formato válido OpenAPI). Esquemas simples compartidos con Postman, compatibles con la validación JSON Schema del sandbox. Ajv 2020 valida adicionalmente cuerpos contra el contrato original. Esto no equivale a validar de manera completa todas las interacciones OpenAPI.

12 casos distintos TC01..TC12; preparación y limpieza son solicitudes auxiliares y no se cuentan como casos. La colección recibe sesiones efímeras desde un endpoint solo local; el ambiente exportado conserva tokens vacíos. El runner guarda solo informes sin cabeceras ni sesiones.

El defecto controlado cambia total numérico por texto exclusivamente al consultar pedidos. Se conserva un parche local y evidencia de la corrida fallida; después se vuelve a la configuración corregida sin cambiar el contrato. Las tres corridas usan datos limpios y verifican que se ejecutaron exactamente los doce IDs.

Entregables: README, matriz CSV/Markdown, colección v2.1, ambiente, contrato, evidencia TXT/JSON/HTML, PDF breve y guion de hasta 3 minutos. No se inventan identidad, repositorio, video ni verificaciones personales del estudiante. Esos datos se completan antes de Canvas.
