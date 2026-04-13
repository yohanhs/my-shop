import { cn } from '@/lib/utils';

type AppAmbientBackgroundProps = {
  /** URL lista para CSS/`shopimg` (p. ej. vía {@link localFileToImgSrc}). */
  imageSrc?: string | null;
};

/**
 * Capa decorativa fija: imagen de configuración difuminada + velo, o degradado con orbes.
 */
export function AppAmbientBackground({ imageSrc }: AppAmbientBackgroundProps) {
  const hasPhoto = Boolean(imageSrc?.trim());

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden>
      <div
        className={cn(
          'absolute inset-0',
          hasPhoto
            ? 'bg-background'
            : 'bg-gradient-to-br from-muted via-muted/90 to-slate-300/55 dark:from-muted/35 dark:via-background dark:to-muted/25',
        )}
      />

      {hasPhoto ? (
        <>
          <div
            className="absolute inset-[-14%] scale-105 bg-cover bg-center bg-no-repeat opacity-[0.98] blur-xl dark:opacity-[0.94] dark:blur-2xl"
            style={{ backgroundImage: `url(${JSON.stringify(imageSrc)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/65 dark:from-black/55 dark:via-black/40 dark:to-black/60" />
          <div className="absolute inset-0 bg-muted/20 dark:bg-muted/10" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-400/10 to-slate-500/18 dark:from-transparent dark:via-muted/15 dark:to-black/25" />
          <div className="absolute -left-[20%] -top-[10%] h-[min(38rem,85vh)] w-[min(38rem,90vw)] rounded-full bg-primary/32 blur-[100px] dark:bg-primary/20" />
          <div className="absolute -bottom-[15%] -right-[18%] h-[min(34rem,75vh)] w-[min(34rem,88vw)] rounded-full bg-sky-400/28 blur-[90px] dark:bg-sky-500/18" />
          <div className="absolute left-[35%] top-[18%] h-[min(22rem,50vh)] w-[min(22rem,55vw)] -translate-x-1/2 rounded-full bg-violet-500/22 blur-[85px] dark:bg-violet-400/14" />
        </>
      )}
    </div>
  );
}
