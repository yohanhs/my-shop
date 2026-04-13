import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Database, Download, FolderOpen, Save, Settings, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ImageDropField } from '@/components/ui/image-drop-field';
import { Input } from '@/components/ui/input';
import {
  configuracionFormDefaults,
  configuracionFormSchema,
  type ConfiguracionFormValues,
} from '@/schemas/configuracionFormSchema';
import { dispatchShopConfigUpdated } from '@/lib/shopBranding';
import { useAuth } from '@/providers/AuthProvider';
import type { Configuracion } from '@/types/electron';

function mapToFormValues(c: Configuracion): ConfiguracionFormValues {
  return {
    nombreTienda: c.nombreTienda,
    moneda: c.moneda,
    impuestoPorcentaje: c.impuestoPorcentaje,
    logoPath: c.logoPath ?? '',
    imagenesDirDefault: c.imagenesDirDefault ?? '',
    fondoAppPath: c.fondoAppPath ?? '',
    depreciacionMensual: c.depreciacionMensual ?? 0,
  };
}

const WIPE_CONFIRM_PHRASE = 'BORRAR';

export function ConfiguracionPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.rolNombre === 'SuperAdmin';

  const [configId, setConfigId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipeBusy, setWipeBusy] = useState(false);

  const form = useForm<ConfiguracionFormValues>({
    resolver: yupResolver(configuracionFormSchema),
    defaultValues: configuracionFormDefaults,
    mode: 'onTouched',
  });

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api?.configuracion : undefined;
    if (!api) {
      setLoadError('Ejecuta la app con Electron (npm run dev:electron).');
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const row = await api.get();
        if (cancelled) return;
        setConfigId(row.id);
        form.reset(mapToFormValues(row));
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError((e as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form]);

  useEffect(() => {
    if (loading || loadError) return;
    const dbApi = window.api?.database;
    if (!dbApi) return;
    let cancelled = false;
    void dbApi
      .getDbPath()
      .then((r) => {
        if (!cancelled) setDbPath(r.path);
      })
      .catch(() => {
        if (!cancelled) setDbPath(null);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, loadError]);

  const onSubmit = async (values: ConfiguracionFormValues) => {
    const api = window.api?.configuracion;
    if (!api || configId == null) {
      toast.error('No hay conexión con la aplicación.');
      return;
    }
    setServerError(null);
    setSaving(true);
    try {
      await api.update(configId, {
        nombreTienda: values.nombreTienda.trim(),
        moneda: values.moneda.trim().toUpperCase(),
        impuestoPorcentaje: values.impuestoPorcentaje,
        logoPath: values.logoPath.trim() === '' ? null : values.logoPath.trim(),
        imagenesDirDefault:
          values.imagenesDirDefault.trim() === '' ? null : values.imagenesDirDefault.trim(),
        fondoAppPath: values.fondoAppPath.trim() === '' ? null : values.fondoAppPath.trim(),
        depreciacionMensual: values.depreciacionMensual,
      });
      toast.success('Configuración guardada');
      dispatchShopConfigUpdated();
    } catch (e) {
      const msg = (e as Error).message;
      setServerError(msg);
      toast.error('No se pudo guardar', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground">Datos generales de la tienda para tickets e informes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Settings className="h-4 w-4" aria-hidden />
            Tienda e impuestos
          </CardTitle>
          <CardDescription>
            El IVA u otro impuesto se expresa en porcentaje (ej. 16 para el 16%).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="nombreTienda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la tienda</FormLabel>
                    <FormControl>
                      <Input placeholder="Mi Tienda" disabled={saving} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="moneda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda</FormLabel>
                      <FormControl>
                        <Input
                          className="font-mono uppercase"
                          placeholder="MXN"
                          maxLength={8}
                          disabled={saving}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>Código ISO (ej. MXN, USD, EUR).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impuestoPorcentaje"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impuesto (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          disabled={saving}
                          value={Number.isFinite(field.value) ? field.value : ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            field.onChange(raw === '' ? Number.NaN : Number(raw));
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>Porcentaje aplicable (p. ej. 16).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="imagenesDirDefault"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carpeta por defecto para imágenes</FormLabel>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <FormControl>
                        <Input
                          readOnly
                          placeholder="Sin carpeta personalizada (se usa la carpeta interna de la app)"
                          disabled={saving}
                          className="font-mono text-xs"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={saving || !window.api?.file}
                          className="gap-2"
                          onClick={() => {
                            void (async () => {
                              const fileApi = window.api?.file;
                              if (!fileApi) return;
                              const picked = await fileApi.pickImagesDirectory();
                              if (picked) field.onChange(picked);
                            })();
                          }}
                        >
                          <FolderOpen className="h-4 w-4" aria-hidden />
                          Elegir carpeta
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saving || !field.value?.trim()}
                          onClick={() => field.onChange('')}
                        >
                          Quitar
                        </Button>
                      </div>
                    </div>
                    <FormDescription>
                      Las imágenes que importes (logo y productos) se copiarán a esta carpeta. Si la dejas vacía, se
                      usa una carpeta interna en los datos de la aplicación.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo de la tienda (opcional)</FormLabel>
                    <FormControl>
                      <ImageDropField
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        disabled={saving}
                        browseLabel="Elegir logo…"
                      />
                    </FormControl>
                    <FormDescription>Se guarda en la base de datos la ruta del archivo copiado.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="depreciacionMensual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depreciación mensual estimada</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        disabled={saving}
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          field.onChange(raw === '' ? Number.NaN : Number.parseFloat(raw));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Se usa en el inicio para estimar depreciación en el periodo: (este monto ÷ 30) × días del rango.
                      Deja en 0 si no aplica.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Database className="h-4 w-4" aria-hidden />
            Respaldo de la base de datos
          </CardTitle>
          <CardDescription>
            Copia el archivo SQLite de la tienda a una memoria USB, otra carpeta o red. Para restaurar, elige un
            archivo <span className="font-mono">.db</span> creado con esta misma app (o un respaldo previo).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dbPath ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">Archivo en uso</p>
              <p className="break-all font-mono text-xs text-foreground">{dbPath}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              La ruta de la base solo está disponible al ejecutar la app con Electron.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={saving || backupBusy || restoreBusy || wipeBusy || !window.api?.database}
              onClick={() => {
                void (async () => {
                  const dbApi = window.api?.database;
                  if (!dbApi) return;
                  setBackupBusy(true);
                  try {
                    const r = await dbApi.backup();
                    if (r.canceled) {
                      toast.message('Respaldo cancelado');
                    } else {
                      toast.success('Copia guardada', { description: r.path });
                    }
                  } catch (e) {
                    toast.error('No se pudo guardar el respaldo', { description: (e as Error).message });
                  } finally {
                    setBackupBusy(false);
                  }
                })();
              }}
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              {backupBusy ? 'Guardando…' : 'Guardar respaldo…'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={saving || backupBusy || restoreBusy || wipeBusy || !window.api?.database}
              onClick={() => {
                void (async () => {
                  const dbApi = window.api?.database;
                  if (!dbApi) return;
                  setRestoreBusy(true);
                  try {
                    const r = await dbApi.restore();
                    if (r.canceled) {
                      toast.message('Importación cancelada');
                    } else {
                      toast.success('Base importada; inicia sesión de nuevo.', {
                        description: `Copia de seguridad previa: ${r.autoBackupPath}`,
                      });
                      window.setTimeout(() => {
                        window.location.reload();
                      }, 800);
                    }
                  } catch (e) {
                    toast.error('No se pudo importar', { description: (e as Error).message });
                  } finally {
                    setRestoreBusy(false);
                  }
                })();
              }}
            >
              <Upload className="h-4 w-4 shrink-0" aria-hidden />
              {restoreBusy ? 'Importando…' : 'Importar base de datos…'}
            </Button>
            {isSuperAdmin && (
              <Button
                type="button"
                variant="destructive"
                className="gap-2 sm:ml-auto"
                disabled={saving || backupBusy || restoreBusy || wipeBusy || !window.api?.database}
                onClick={() => {
                  setWipeConfirmText('');
                  setWipeDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                Limpiar base de datos…
              </Button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Antes de importar se crea automáticamente una copia de la base actual en la carpeta de datos de la
            aplicación. Puedes guardar también un respaldo manual a una memoria USB antes de cambiar de equipo o
            fusionar datos.
          </p>
          {isSuperAdmin && (
            <p className="text-xs leading-relaxed text-destructive/90">
              «Limpiar base de datos» borra ventas, inventario, gastos, proveedores y usuarios dentro de la app. Haz un
              respaldo antes si necesitas conservar algo. Solo quedará el usuario <span className="font-mono">admin</span>{' '}
              con contraseña por defecto y la configuración inicial de la tienda.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={wipeDialogOpen}
        onOpenChange={(open) => {
          setWipeDialogOpen(open);
          if (!open) setWipeConfirmText('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Advertencia: limpiar todos los datos</DialogTitle>
            <DialogDescription className="space-y-3 text-left">
              <span className="block">
                Esta acción <strong className="text-foreground">no se puede deshacer</strong> desde la aplicación. Se
                eliminarán ventas, detalles de venta, movimientos de stock, productos, gastos, proveedores y todos los
                usuarios (incluido el tuyo).
              </span>
              <span className="block">
                Después se recrearán los roles del sistema, el usuario administrador por defecto y una configuración de
                tienda vacía. Tendrás que iniciar sesión de nuevo.
              </span>
              <span className="block font-medium text-destructive">
                Te recomendamos guardar un respaldo en archivo antes de continuar.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="wipe-confirm" className="text-sm font-medium">
              Escribe <span className="font-mono">{WIPE_CONFIRM_PHRASE}</span> para confirmar
            </label>
            <Input
              id="wipe-confirm"
              autoComplete="off"
              placeholder={WIPE_CONFIRM_PHRASE}
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              disabled={wipeBusy}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={wipeBusy} onClick={() => setWipeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                wipeBusy || wipeConfirmText.trim().toUpperCase() !== WIPE_CONFIRM_PHRASE || !window.api?.database
              }
              onClick={() => {
                void (async () => {
                  const dbApi = window.api?.database;
                  if (!dbApi) return;
                  setWipeBusy(true);
                  try {
                    await dbApi.wipeAllData();
                    setWipeDialogOpen(false);
                    setWipeConfirmText('');
                    toast.success('Base limpiada; inicia sesión de nuevo.', {
                      description: 'Usuario por defecto: admin / admin123 (cámbialo en cuanto puedas).',
                    });
                    window.setTimeout(() => {
                      window.location.reload();
                    }, 800);
                  } catch (e) {
                    toast.error('No se pudo limpiar la base', { description: (e as Error).message });
                  } finally {
                    setWipeBusy(false);
                  }
                })();
              }}
            >
              {wipeBusy ? 'Limpiando…' : 'Sí, borrar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
