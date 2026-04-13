/** Codifica ruta absoluta (UTF-8) para el query `p` del protocolo `shopimg`. */
function pathToBase64Url(absPath: string): string {
  const bytes = new TextEncoder().encode(absPath);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function legacyFileUrl(absPath: string): string | null {
  const trimmed = absPath.trim();
  if (!trimmed) return null;
  let p = trimmed.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(p)) {
    p = `/${p}`;
  } else if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  try {
    return encodeURI(`file://${p}`).replace(/#/g, '%23');
  } catch {
    return null;
  }
}

/**
 * URL para `<img src>` de archivos locales del disco.
 * Con Electron + Vite (`http://localhost`) `file://` está bloqueado; si existe `window.api` se usa `shopimg://`.
 */
export function localFileToImgSrc(absPath: string | null | undefined): string | undefined {
  if (!absPath?.trim()) return undefined;
  const t = absPath.trim();
  const api = typeof window !== 'undefined' ? (window as unknown as { api?: object }).api : undefined;
  if (api) {
    return `shopimg://asset?p=${pathToBase64Url(t)}`;
  }
  return legacyFileUrl(t) ?? undefined;
}
