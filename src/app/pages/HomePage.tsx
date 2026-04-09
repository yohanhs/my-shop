import { Link } from 'react-router-dom';
import { ArrowRight, Package, Settings, ShoppingCart, Wallet } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const shortcuts = [
  {
    to: '/productos',
    title: 'Productos',
    description: 'Catálogo, precios e inventario.',
    icon: Package,
  },
  {
    to: '/ventas',
    title: 'Ventas',
    description: 'Tickets y historial (próximamente).',
    icon: ShoppingCart,
  },
  {
    to: '/gastos',
    title: 'Gastos',
    description: 'Egresos y categorías (próximamente).',
    icon: Wallet,
  },
  {
    to: '/configuracion',
    title: 'Configuración',
    description: 'Tienda, moneda e impuestos (próximamente).',
    icon: Settings,
  },
] as const;

export function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inicio</h2>
        <p className="mt-1 text-muted-foreground">
          Accesos rápidos a las secciones de la aplicación.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {shortcuts.map(({ to, title, description, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="mt-1">{description}</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-sm font-medium text-primary">Abrir sección</span>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
