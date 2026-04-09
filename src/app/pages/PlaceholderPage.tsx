interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {description ?? 'Esta sección estará disponible en una próxima versión.'}
      </p>
    </div>
  );
}
