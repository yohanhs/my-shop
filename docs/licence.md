## Módulo 2: Validación en Electron (App Client)
*Ubicación sugerida: /src/main/licenseManager.js*

### Requisitos de Implementación:
1. **Fingerprinting de Hardware:**
   - Usar `node-machine-id` para obtener el ID único de la máquina.
   - Debe ser consistente en reinicios del sistema.

2. **Verificación de Firma:**
   - Cargar `public.pem` (embebida en los assets de la app).
   - Usar `crypto.verify` para asegurar que el objeto `data` no ha sido alterado comparándolo con la `signature`.

3. **Lógica de Validación de Suscripción:**
   - **Paso 1:** Validar integridad de la firma.
   - **Paso 2:** Comparar `machineId` del archivo con el ID local.
   - **Paso 3:** Comparar `expiresAt` con la fecha actual del sistema.
   - **Paso 4 (Anti-Reloj):** - Usar `electron-store` para guardar `lastAccessDate`.
     - Si `currentTime < lastAccessDate`, bloquear app (indica que el usuario atrasó el reloj de la PC).

### Integración con Main Process:
- Crear un IPC Bridge para que el proceso de renderizado pueda consultar el estado de la licencia: `ipcMain.handle('check-license', ...)`
- Si la licencia es inválida o expiró, redirigir a una vista de "Activación".

### Contrato con el Módulo 1 (implementado en esta app)
- **Archivo:** `licencia.lic` (texto JSON o base64 de ese JSON).
- **Contenido:** `{ "data": { "machineId": "<node-machine-id>", "expiresAt": "<ISO8601>" }, "signature": "<base64>" }`.
- **Firma Ed25519:** sobre los bytes UTF-8 de `JSON.stringify(data)` con `data` construido como `{ machineId, expiresAt }` en ese orden (equivalente en JSON a `{"machineId":"…","expiresAt":"…"}`).
- **Clave pública:** `src/assets/public.pem` (desarrollo) y copia a `dist/assets/public.pem` en `npm run build`.
- **Búsqueda de `licencia.lic` (orden):** `userData/licencia.lic` (tras «Buscar archivo…» en la pantalla de activación), carpeta de inicio (`~/licencia.lic`), carpeta de trabajo (`./licencia.lic`), y junto al ejecutable si la app está empaquetada.
- **Desarrollo:** si la app no está empaquetada, o con `MY_SHOP_SKIP_LICENSE=1`, no se exige licencia.
- **Probar licencia sin `.dmg` / instalador:** tras `npm run build`, ejecuta con `MY_SHOP_FORCE_LICENSE=1` (y **sin** `MY_SHOP_SKIP_LICENSE=1`). Coloca `licencia.lic` en tu home o en la raíz del proyecto y usa `public.pem` emparejada con el Módulo 1.
- **Producción empaquetada:** con `app.isPackaged === true` la licencia se exige siempre (salvo `MY_SHOP_SKIP_LICENSE=1`).

---

## Seguridad y Ofuscación
1. **Compilación:** Indicar a Cursor que configure la lógica de validación para ser procesada por `bytenode` en el build final.
2. **Hardening:** No almacenar la clave pública como un archivo plano fácil de encontrar; inyectarla como variable de entorno o string ofuscado durante el build.