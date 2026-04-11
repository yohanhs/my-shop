import { HomeDashboard } from '@/components/home/HomeDashboard';

export function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inicio</h2>
        <p className="mt-1 text-muted-foreground">Resumen e indicadores del negocio.</p>
      </div>

      <HomeDashboard />
    </div>
  );
}
