Icono de la aplicación (Electron / electron-builder)
====================================================

1) Coloca aquí un PNG llamado exactamente:

   icon.png

2) Tamaño recomendado: mínimo 512×512 px (mejor 1024×1024).
   Fondo cuadrado; en macOS se puede usar transparencia.

3) electron-builder usará ese archivo para:
   - macOS: .app, .dmg, .zip
   - Windows: .exe (portable / instalador)
   - Linux: AppImage / .deb

4) electron-builder busca solo en la carpeta "build" (buildResources):
   - icon.png     → se usa en todas las plataformas si existe (recomendado).
   - icon.icns    → macOS (si existe, suele tener prioridad en Mac).
   - icon.ico     → Windows (si existe, suele tener prioridad en Win).

5) Si no pones ningún icono, el empaquetado sigue pero verás el aviso de icono por defecto de Electron.

Cómo generar .icns en Mac (opcional): abre tu PNG en Vista previa → Exportar → y convierte con
   iconutil o herramientas online "png to icns".
Para .ico en Windows: "png to ico" online o GIMP con plugin ICO.
