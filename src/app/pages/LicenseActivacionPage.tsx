import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Copy, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LicenseSelectInstallResult } from '@/types/electron';

type CheckResult =
  | { valid: true }
  | { valid: false; reason: string; code?: string };

export function LicenseActivacionPage({
  initialReason,
  onRecheck,
  onValidLicense,
}: {
  initialReason: string;
  onRecheck: () => Promise<CheckResult>;
  onValidLicense: () => void;
}) {
  const [reason, setReason] = useState(initialReason);
  const [busy, setBusy] = useState(false);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [machineIdError, setMachineIdError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.api?.license;
    if (!api?.getMachineId) return;
    let cancelled = false;
    void api.getMachineId().then((r) => {
      if (cancelled) return;
      if (r.ok) setMachineId(r.machineId);
      else setMachineIdError(r.reason);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyMachineId = useCallback(async () => {
    const api = window.api?.license;
    if (!api?.getMachineId) {
      toast.error('No hay puente con Electron.');
      return;
    }
    let id = machineId;
    if (!id) {
      const r = await api.getMachineId();
      if (!r.ok) {
        toast.error('No se pudo leer el ID del equipo', { description: r.reason });
        return;
      }
      id = r.machineId;
      setMachineId(id);
    }
    try {
      await navigator.clipboard.writeText(id);
      toast.success('ID de equipo copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar; selecciona el texto manualmente si aparece abajo.');
    }
  }, [machineId]);

  const recheck = useCallback(async () => {
    setBusy(true);
    try {
      const r = await onRecheck();
      if (r.valid) onValidLicense();
      else setReason(r.reason);
    } finally {
      setBusy(false);
    }
  }, [onRecheck, onValidLicense]);

  const selectFile = useCallback(async () => {
    const api = window.api?.license;
    if (!api?.selectAndInstall) {
      toast.error('No hay puente con Electron.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.selectAndInstall();
      if ('canceled' in r && r.canceled) {
        toast.message('Selección cancelada');
        return;
      }
      const check = r as Exclude<LicenseSelectInstallResult, { canceled: true }>;
      if (check.valid) {
        toast.success('Licencia instalada correctamente');
        onValidLicense();
      } else {
        setReason(check.reason);
        toast.error('La licencia no es válida', { description: check.reason });
      }
    } finally {
      setBusy(false);
    }
  }, [onValidLicense]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activación de licencia</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Puedes <strong className="text-foreground">elegir un archivo</strong> y la app lo guardará en sus datos; o
          coloca manualmente <span className="font-mono">licencia.lic</span> en tu carpeta de usuario o en la carpeta del
          proyecto y usa «Volver a comprobar».
        </p>
      </div>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" aria-hidden />
        <AlertTitle>Licencia no válida</AlertTitle>
        <AlertDescription className="whitespace-pre-wrap text-sm">{reason}</AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">ID de equipo (para el generador de licencias)</p>
        {machineId ? (
          <p className="mt-1 break-all font-mono text-xs text-foreground">{machineId}</p>
        ) : machineIdError ? (
          <p className="mt-1 text-xs text-destructive">{machineIdError}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Cargando…</p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 gap-2"
          disabled={busy || (!machineId && !machineIdError)}
          title="Copia el identificador que debe coincidir con el campo machineId de tu licencia"
          onClick={() => void copyMachineId()}
        >
          <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Copiar ID al portapapeles
        </Button>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Mismo identificador en macOS y Windows; pégalo en el Módulo 1 al generar la licencia.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="default" className="gap-2" disabled={busy} onClick={() => void selectFile()}>
          <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
          {busy ? 'Procesando…' : 'Buscar archivo de licencia…'}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void recheck()}>
          {busy ? 'Comprobando…' : 'Volver a comprobar'}
        </Button>
      </div>
    </div>
  );
}
