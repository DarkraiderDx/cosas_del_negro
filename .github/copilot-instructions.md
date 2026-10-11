# SIAT Bolivia API

- This workspace is a Node.js and TypeScript REST API, not an Electron renderer or frontend.
- Keep HTTP handlers, business services, persistence, and SIAT adapters separated.
- Do not invent SIN endpoints, SOAP operations, credentials, CUIS/CUFD fields, invoice XML tags, XSD rules, or contingency limits.
- Keep SIAT transmission disabled until verified official contracts and schemas for the selected modality are added.
- Never represent a locally queued invoice as accepted or authorized by the SIN.
- Bind to loopback by default. Add authentication and authorization before exposing the API outside the local machine.
- Run `npm run build` and `npm test` after backend changes.