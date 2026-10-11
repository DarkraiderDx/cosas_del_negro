# SIAT Bolivia API

Backend REST en Node.js y TypeScript ejecutado dentro del proceso principal de Electron. Electron administra el ciclo de vida del API; un frontend futuro puede consumirlo por HTTP en loopback. Esta primera base permite registrar y consultar facturas locales y mantener una cola persistente de contingencia. Todavia no transmite al SIN ni genera XML oficial.

## Estructura

```text
src/
  main/       Proceso principal, API, dominio, base de datos e integracion SIAT
    ipc/      Canales IPC permitidos para el renderer
    siat/     Gateway activo y responsabilidades SIAT previstas
  preload/    API tipada y limitada expuesta mediante contextBridge
  renderer/  Espacio reservado para pages, components y stores
resources/   XSD publicos versionados; nunca almacenar claves privadas
```

## Requisitos

- Node.js 24 o superior
- npm

## Desarrollo

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

`npm run dev` compila TypeScript y lanza Electron; Electron Main inicia el servidor Fastify. La API escucha por defecto en `http://127.0.0.1:3000`. OpenAPI/Swagger UI esta en `http://127.0.0.1:3000/docs`; health check: `GET /health`.

```powershell
npm test
npm run build
npm start
npm run dist
```

`npm run dist` crea el instalador Windows usando `electron-builder.yml`. El renderer aun no esta implementado ni se abre una ventana. El preload y el canal IPC inicial quedan listos como base, pero el API HTTP sigue siendo la interfaz para clientes externos.

Electron guarda los datos en su directorio `userData`; se puede definir `DATA_FILE` para elegir otra ruta. El almacenamiento JSON es intencionalmente una base inicial de un solo proceso; antes de operar con multiples instancias o volumen de produccion debe sustituirse por una base transaccional.

## API v1

### Crear factura local

`POST /api/v1/invoices`

```json
{
  "customerNit": "123456789",
  "customerName": "Cliente de prueba",
  "currency": "BOB",
  "lines": [
    { "description": "Producto", "quantity": 2, "unitPrice": 5.5 }
  ],
  "contingency": false
}
```

`currency` toma `BOB` por defecto. `contingency: true` guarda la factura con estado local `queued` y crea una entrada pendiente en la cola. Importes se redondean a dos decimales. Responde `201` con el registro creado.

### Consultar facturas

- `GET /api/v1/invoices`
- `GET /api/v1/invoices/{id}`

### Cola local de contingencia

- `POST /api/v1/contingency/queue/{invoiceId}` agrega una factura existente; es idempotente mientras la entrada no este completada.
- `GET /api/v1/contingency/queue` lista las entradas persistidas.

Esta cola conserva trabajo local, pero aun no implementa las condiciones, plazos, eventos, empaquetado ni envio que establezca el procedimiento oficial del SIN. No debe interpretarse `queued` como una autorizacion de facturacion.

### Operaciones SIAT pendientes de contratos oficiales

- `GET /api/v1/siat/readiness` explica por que la integracion no esta habilitada.
- `POST /api/v1/siat/cuis`
- `POST /api/v1/siat/cufd`
- `POST /api/v1/invoices/{id}/xml`
- `POST /api/v1/invoices/{id}/submit`

Las cuatro operaciones mutables responden `503 SIAT_NOT_CONFIGURED` hasta integrar contratos verificados. No se inventan solicitudes SOAP ni se devuelve una respuesta de autorizacion ficticia.

## Configuracion

| Variable | Predeterminado | Descripcion |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Direccion de escucha; loopback por seguridad |
| `PORT` | `3000` | Puerto HTTP |
| `DATA_FILE` | `./data/siat-api.json` | Archivo local de persistencia |
| `CORS_ORIGINS` | `http://localhost:5173` | Origenes permitidos separados por coma |
| `SIAT_ENVIRONMENT` | `test` | Entorno declarado (`test` o `production`), no cambia por si solo el endpoint SIAT |

No se ha agregado autenticacion porque la API solo escucha en loopback. No la expongas en la red ni cambies `HOST` a `0.0.0.0` sin implementar autenticacion, autorizacion y manejo de secretos.

## Para habilitar integracion real

Antes de completar SOAP, CUIS/CUFD, XML y contingencia se necesitan los artefactos vigentes publicados por el SIN para la modalidad elegida:

1. Manual tecnico y WSDL vigentes, con ambientes de pruebas/produccion y operaciones por modalidad.
2. XSD oficial, catalogos y reglas de construccion/validacion de CUF y XML.
3. Requisitos de firma, autenticacion, certificados y manejo de credenciales.
4. Procedimiento vigente de contingencia: causales, registro, plazos, limites y reenvio.
5. Credenciales de pruebas y casos de conformidad del SIN.

Computarizada en Linea y Electronica en Linea deben confirmarse como modalidades distintas. Este proyecto no declara cumplimiento normativo ni debe usarse para emitir comprobantes fiscales hasta superar pruebas oficiales de homologacion y revision profesional/regulatoria.