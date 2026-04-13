import { useCallback, useEffect, useState } from 'react';

import { AppAmbientBackground } from '@/components/layout/AppAmbientBackground';
import { localFileToImgSrc } from '@/lib/localImageSrc';
import { SHOP_CONFIG_UPDATED_EVENT } from '@/lib/shopBranding';

/**
 * Fondo global según `fondoAppPath` en configuración (lectura pública para incluir login).
 */
export function ShopAppBackground() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const load = useCallback(async () => {
    const api = typeof window !== 'undefined' ? window.api?.configuracion : undefined;
    if (!api?.getPublicAmbient) {
      setImageSrc(null);
      return;
    }
    try {
      const { fondoAppPath } = await api.getPublicAmbient();
      setImageSrc(localFileToImgSrc(fondoAppPath ?? undefined) ?? null);
    } catch {
      setImageSrc(null);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(SHOP_CONFIG_UPDATED_EVENT, load);
    return () => window.removeEventListener(SHOP_CONFIG_UPDATED_EVENT, load);
  }, [load]);

  return <AppAmbientBackground imageSrc={imageSrc} />;
}
