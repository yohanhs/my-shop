import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Eye, EyeOff, Save, UserRound } from 'lucide-react';
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
import { useAuth } from '@/providers/AuthProvider';
import {
  usuarioPerfilFormDefaultValues,
  usuarioPerfilFormSchema,
  type UsuarioPerfilFormValues,
} from '@/schemas/usuarioFormSchema';
import type { Usuario } from '@/types/electron';

function mapUsuarioToForm(u: Usuario): UsuarioPerfilFormValues {
  return {
    nombre: u.nombre,
    username: u.username,
    password: '',
  };
}

export function PerfilPage() {
  const { user, refreshUser } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rolNombre, setRolNombre] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<UsuarioPerfilFormValues>({
    resolver: yupResolver(usuarioPerfilFormSchema),
    defaultValues: usuarioPerfilFormDefaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api?.usuario : undefined;
    if (!api || !user) {
      setLoadError('Ejecuta la app con Electron (npm run dev:electron).');
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const row = await api.getById(user.usuarioId);
        if (cancelled) return;
        if (!row) {
          setLoadError('No se encontró tu usuario en la base de datos.');
          return;
        }
        setRolNombre(row.rolNombre);
        form.reset(mapUsuarioToForm(row));
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
  }, [form, user]);

  const onSubmit = async (values: UsuarioPerfilFormValues) => {
    const api = window.api?.usuario;
    if (!api || !user) {
      toast.error('No hay conexión con la aplicación.');
      return;
    }
    setServerError(null);
    setSaving(true);
    try {
      const payload: { nombre: string; username: string; password?: string } = {
        nombre: values.nombre.trim(),
        username: values.username.trim(),
      };
      const pw = values.password?.trim();
      if (pw) payload.password = pw;
      await api.update(user.usuarioId, payload);
      form.reset({ ...values, password: '' });
      setShowPassword(false);
      await refreshUser();
      toast.success('Perfil actualizado');
    } catch (e) {
      const raw = (e as Error).message;
      const msg = raw.replace(/^Error invoking remote method 'usuario:update':\s*/i, '').replace(/^Error:\s*/i, '');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Actualiza tu nombre, usuario de acceso y contraseña. El rol solo lo puede cambiar un SuperAdmin (desde Usuarios).
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5 text-muted-foreground" aria-hidden />
            Datos de la cuenta
          </CardTitle>
          <CardDescription>
            Rol: <span className="font-medium text-foreground">{rolNombre || '—'}</span> (SuperAdmin o Cajero)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre" disabled={saving} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario (inicio de sesión)</FormLabel>
                    <FormControl>
                      <Input
                        className="font-mono"
                        autoComplete="username"
                        disabled={saving}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Dejar vacío para no cambiar"
                          disabled={saving}
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={saving}
                        className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      </Button>
                    </div>
                    <FormDescription>Mínimo 6 caracteres si escribes una nueva contraseña.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" aria-hidden />
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
