import { Toaster as Sonner } from 'sonner';
import 'sonner/dist/styles.css';

type ToasterProps = {
  /** Alineado con la clase `dark` de la app (modo oscuro). */
  theme?: 'light' | 'dark' | 'system';
};

export function Toaster({ theme = 'light' }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:border-border group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  );
}
