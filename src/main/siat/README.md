# Modulos SIAT pendientes

Ubicacion prevista para separar las responsabilidades de integracion:

- `soap-client.ts`: transporte SOAP, timeouts, TLS y parsing de respuestas segun WSDL verificado.
- `cuis.ts` y `cufd.ts`: solicitud, persistencia, vigencia y renovacion segun el manual de la modalidad.
- `xml-generator.ts`: construccion y validacion contra XSD oficial versionado.
- `signer.ts`: firma con el mecanismo y certificado exigidos por el SIN.
- `emission.ts`: envio, interpretacion de codigos y persistencia de respuestas.
- `contingency.ts`: causales, limites, registro y reenvio conforme al procedimiento vigente.

No se crean operaciones ni payloads provisionales: hacen falta manuales, WSDL, XSD y reglas oficiales para implementarlos sin simular cumplimiento.