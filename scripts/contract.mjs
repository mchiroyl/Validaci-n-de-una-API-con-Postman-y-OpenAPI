// Authoring source for openapi/openapi.json. JSON is an OpenAPI supported format.
const uuid = { type: 'string', format: 'uuid', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' };
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const date = { type: 'string', format: 'date-time' };
const orderProperties = {
  id: uuid, owner: { type: 'string', enum: ['usuario_a', 'usuario_b'] }, product: { type: 'string', enum: ['CUADERNO'] },
  quantity: { type: 'integer', minimum: 1, maximum: 10 }, total: { type: 'number', minimum: 25, maximum: 250, multipleOf: 25 },
  status: { type: 'string', enum: ['draft', 'confirmed'] }, confirmationCount: { type: 'integer', minimum: 0, maximum: 1 },
  createdAt: date, confirmedAt: { anyOf: [date, { type: 'null' }] }
};
const response = (description, schema, headers) => ({ description, content: { 'application/json': { schema } }, ...(headers ? { headers } : {}) });
const errorResponse = (status, code, description) => response(description, object({ error: object({ code: { type: 'string', enum: [code] }, message: { type: 'string', minLength: 1 } }) }), status === 401 ? { 'WWW-Authenticate': { required: true, schema: { type: 'string', enum: ['Bearer'] }, description: 'Desafío Bearer' } } : undefined);
const errors = {
  400: errorResponse(400, 'VALIDATION_ERROR', 'Datos, UUID o parámetros inválidos'),
  401: errorResponse(401, 'UNAUTHORIZED', 'Credenciales ausentes o inválidas'),
  403: errorResponse(403, 'FORBIDDEN', 'El pedido pertenece a otro usuario'),
  404: errorResponse(404, 'NOT_FOUND', 'Pedido o ruta inexistente'),
  413: errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Cuerpo mayor de 16 KiB'),
  415: errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE', 'Cuerpo debe usar application/json'),
  500: errorResponse(500, 'INTERNAL_ERROR', 'Error interno')
};
const withErrors = codes => Object.fromEntries([...codes, 500].map(code => [code, errors[code]]));
const idParam = { name: 'id', in: 'path', required: true, description: 'UUID v4 obtenido durante la ejecución actual', schema: uuid };
export const contract = {
  openapi: '3.1.0',
  jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  info: { title: 'API local de pedidos', version: '1.0.0', description: 'Ejercicio individual. Importes en quetzales. Preparación exclusivamente local; no usar en producción. El listado filtra por propietario. POST no es idempotente.' },
  servers: [{ url: 'http://127.0.0.1:3000', description: 'Solo loopback' }],
  security: [{ bearerAuth: [] }],
  tags: [{ name: 'Pedidos', description: 'Operaciones evaluadas' }, { name: 'Preparación', description: 'Auxiliares locales, fuera de los 12 casos' }],
  paths: {
    '/orders': {
      get: { tags: ['Pedidos'], operationId: 'listOrders', summary: 'Listar pedidos propios con paginación', description: 'Orden de inserción. Se rechazan parámetros desconocidos y duplicados. Una página fuera del total devuelve items vacío. No acepta cuerpo.', parameters: [
        { name: 'page', in: 'query', description: 'Página desde 1', schema: { type: 'integer', minimum: 1, maximum: 1000000, default: 1 } },
        { name: 'limit', in: 'query', description: 'Tamaño de página', schema: { type: 'integer', minimum: 1, maximum: 20, default: 2 } }
      ], responses: { 200: response('Página propia', ref('OrderPage')), ...withErrors([400, 401]) } },
      post: { tags: ['Pedidos'], operationId: 'createOrder', summary: 'Crear borrador', description: 'Precio fijo Q25 por CUADERNO; total=quantity*25. No acepta owner ni total enviados por cliente. Cada POST válido crea un pedido nuevo.', requestBody: { required: true, content: { 'application/json': { schema: ref('CreateOrder'), example: { product: 'CUADERNO', quantity: 2 } } } }, responses: { 201: response('Pedido creado', ref('Order'), { Location: { required: true, description: 'URI relativa del pedido creado', schema: { type: 'string', pattern: '^/orders/[0-9a-f-]{36}$' } } }), ...withErrors([400, 401, 413, 415]) } }
    },
    '/orders/{id}': {
      parameters: [idParam],
      get: { tags: ['Pedidos'], operationId: 'getOrder', summary: 'Consultar pedido protegido', responses: { 200: response('Pedido propio', ref('Order')), ...withErrors([400, 401, 403, 404]) } },
      delete: { tags: ['Pedidos'], operationId: 'deleteOrder', summary: 'Eliminar pedido propio (limpieza)', responses: { 200: response('Eliminado', ref('Deleted')), ...withErrors([400, 401, 403, 404]) } }
    },
    '/orders/{id}/confirmation': {
      parameters: [idParam],
      put: { tags: ['Pedidos'], operationId: 'confirmOrder', summary: 'Confirmación idempotente', description: 'Sin cuerpo. draft pasa a confirmed, confirmationCount=1 y confirmedAt se asigna una sola vez. Repetir el PUT conserva fecha, contador, total y número de pedidos. El efecto se persiste en disco; no crea pagos ni pedidos adicionales.', responses: { 200: response('Confirmación final', ref('Order')), ...withErrors([400, 401, 403, 404, 413, 415]) } }
    },
    '/health': { get: { tags: ['Preparación'], security: [], operationId: 'health', summary: 'Comprobar servicio', responses: { 200: response('Disponible', object({ status: { type: 'string', enum: ['ok'] } })) } } },
    '/__demo/prepare': { post: { tags: ['Preparación'], security: [], operationId: 'prepareDemo', summary: 'Reiniciar fixtures locales y emitir sesiones temporales', description: 'Destructivo únicamente para los datos sintéticos de esta demo. Solo servidor loopback. Rechaza encabezado Origin. No acepta datos personales. No publicar el servicio ni exportar el cuerpo de esta respuesta.', responses: { 200: response('Fixtures de esta ejecución', ref('Fixture')), ...withErrors([403]) } } }
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Opaque demo session', description: 'Sesión aleatoria local obtenida durante preparación, sin contraseñas' } },
    schemas: {
      CreateOrder: object({ product: orderProperties.product, quantity: orderProperties.quantity }),
      Order: object(orderProperties),
      OrderPage: object({ items: { type: 'array', items: ref('Order') }, page: { type: 'integer', minimum: 1, maximum: 1000000 }, limit: { type: 'integer', minimum: 1, maximum: 20 }, total: { type: 'integer', minimum: 0 }, totalPages: { type: 'integer', minimum: 0 } }),
      Deleted: object({ deleted: { type: 'boolean', enum: [true] }, id: uuid }),
      Error: object({ error: object({ code: { type: 'string', enum: ['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'METHOD_NOT_ALLOWED', 'INTERNAL_ERROR'] }, message: { type: 'string', minLength: 1 } }) }),
      Fixture: object({ users: { type: 'array', items: { type: 'string', enum: ['usuario_a', 'usuario_b'] }, minItems: 2, maxItems: 2 }, tokens: object({ usuario_a: { type: 'string', pattern: '^[a-f0-9]{64}$' }, usuario_b: { type: 'string', pattern: '^[a-f0-9]{64}$' } }), ownIds: { type: 'array', items: uuid, minItems: 3, maxItems: 3 }, foreignId: uuid })
    }
  }
};
