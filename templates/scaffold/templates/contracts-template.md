# contracts/: [Nombre de la feature]

Un archivo por endpoint o interfaz nueva/modificada, en `specs/NNN-slug/contracts/`. Formato por archivo:

## `MÉTODO /ruta`

- **Requiere permiso:** `recurso.acción`
- **Request:** [forma del body/params]
- **Response (200/201/...):** [forma]
- **Errores:** [status → cuándo]

Es el contrato, no el `Router` de Express — sin implementación.
