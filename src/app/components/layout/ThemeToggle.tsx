import { Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      onClick={toggleTheme}
      className={cn(
        'relative h-9 w-14 shrink-0 cursor-pointer rounded-full border border-border p-1',
        'bg-muted/80 transition-colors hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border/60 transition-transform duration-200 ease-out',
          isDark ? 'translate-x-5' : 'translate-x-0',
        )}
        aria-hidden
      >
        {isDark ? <Moon className="h-4 w-4" strokeWidth={2} /> : <Sun className="h-4 w-4" strokeWidth={2} />}
      </span>
      <span className="sr-only">{isDark ? 'Modo oscuro' : 'Modo claro'}</span>
    </button>
  );
}
