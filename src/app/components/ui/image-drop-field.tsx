import { forwardRef, useCallback, useState } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function pathFromDroppedFile(file: File): string | null {
  const p = (file as File & { path?: string }).path;
  return typeof p === 'string' && p.trim().length > 0 ? p.trim() : null;
}

/** Vista previa local en Electron (sin depender del módulo `url` en el bundle del navegador). */
function pathToLocalFileHref(absPath: string): string | null {
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

export interface ImageDropFieldProps {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
  /** Texto del botón para elegir archivo */
  browseLabel?: string;
  className?: string;
}

export const ImageDropField = forwardRef<HTMLDivElement, ImageDropFieldProps>(function ImageDropField(
  { value, onChange, disabled, browseLabel = 'Examinar…', className },
  ref,
) {
  const [dragActive, setDragActive] = useState(false);
  const api = typeof window !== 'undefined' ? window.api?.file : undefined;

  const importFromPath = useCallback(
    async (sourcePath: string) => {
      if (!api) {
        toast.error('Solo disponible en la app de escritorio.');
        return;
      }
      try {
        const { path: dest } = await api.importImage(sourcePath);
        onChange(dest);
        toast.success('Imagen importada');
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [api, onChange],
  );

  const onPickFile = useCallback(async () => {
    if (!api || disabled) return;
    const picked = await api.pickImageFile();
    if (!picked) return;
    await importFromPath(picked);
  }, [api, disabled, importFromPath]);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files ?? []);
      const imageLike = files.find((f) => f.type.startsWith('image/'));
      const candidate = imageLike ?? files[0];
      if (!candidate) {
        toast.error('Suelta un archivo de imagen.');
        return;
      }
      const p = pathFromDroppedFile(candidate);
      if (!p) {
        toast.error('No se pudo leer la ruta del archivo. Usa «Examinar» o arrastra desde el disco.');
        return;
      }
      await importFromPath(p);
    },
    [disabled, importFromPath],
  );

  const src = value.trim() ? pathToLocalFileHref(value) : null;

  return (
    <div ref={ref} className={cn('space-y-3', className)}>
      <div
        role="group"
        aria-label="Zona para importar imagen"
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragActive(false);
          }
        }}
        onDrop={onDrop}
        className={cn(
          'flex min-h-[120px] cursor-default flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center text-sm transition-colors',
          dragActive && !disabled && 'border-primary bg-primary/5',
          disabled && 'pointer-events-none opacity-50',
          !disabled && 'hover:border-muted-foreground/40',
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">
          Arrastra una imagen aquí o elige un archivo. Se copiará a la carpeta configurada (o a la carpeta interna de la
          app).
        </p>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => void onPickFile()}>
          {browseLabel}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          readOnly
          value={value}
          placeholder="Sin imagen"
          disabled={disabled}
          className="font-mono text-xs"
          title={value}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || value.trim() === ''}
          onClick={() => onChange('')}
        >
          Quitar
        </Button>
      </div>

      {src ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <img src={src} alt="" className="max-h-24 max-w-full rounded object-contain" />
        </div>
      ) : null}
    </div>
  );
});
