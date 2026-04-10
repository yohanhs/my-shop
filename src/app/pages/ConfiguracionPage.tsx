import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Save, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  configuracionFormDefaults,
  configuracionFormSchema,
  type ConfiguracionFormValues,
} from '@/schemas/configuracionFormSchema';
import type { Configuracion } from '@/types/electron';

function mapToFormValues(c: Configuracion): ConfiguracionFormValues {
  return {
    nombreTienda: c.nombreTienda,
    moneda: c.moneda,
    impuestoPorcentaje: c.impuestoPorcentaje,
    logoPath: c.logoPath ?? '',
  };
}

export function ConfiguracionPage() {
  const [configId, setConfigId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      });
      toast.success('Configuración guardada');
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
    <div className="mx-auto max-w-2xl space-y-6">
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
                name="logoPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ruta del logo (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/ruta/al/logo.png"
                        disabled={saving}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ruta local al archivo de imagen para mostrar en documentos (si la implementas en la app).
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
    </div>
  );
}
