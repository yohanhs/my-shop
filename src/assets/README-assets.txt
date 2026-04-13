public.pem — clave pública Ed25519 (PEM SPKI) del Módulo 1. Sustituye este archivo por el tuyo en producción.

El Módulo 2 firma UTF-8(JSON.stringify(data)) con data = { machineId, expiresAt }; machineId debe ser el mismo que devuelve node-machine-id (machineIdSync() sin opciones) en esta app.
