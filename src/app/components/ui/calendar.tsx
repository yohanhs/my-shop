import * as React from 'react';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

import 'react-day-picker/style.css';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = es,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn('p-2', className)}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        month_caption: cn(
          'flex h-9 w-full items-center justify-center px-10 text-sm font-medium',
          defaultClassNames.month_caption,
        ),
        nav: cn('absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1', defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-8 w-8 shrink-0 bg-transparent p-0 opacity-80 hover:opacity-100',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-8 w-8 shrink-0 bg-transparent p-0 opacity-80 hover:opacity-100',
          defaultClassNames.button_next,
        ),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'w-9 text-center text-[0.8rem] font-normal text-muted-foreground',
          defaultClassNames.weekday,
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        day: cn(
          'relative flex h-9 w-9 items-center justify-center p-0 text-center text-sm [&:last-child[data-selected=true]_button]:rounded-r-md [&:first-child[data-selected=true]_button]:rounded-l-md',
          defaultClassNames.day,
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
          defaultClassNames.day_button,
        ),
        selected: cn('bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground', defaultClassNames.selected),
        today: cn('bg-accent text-accent-foreground', defaultClassNames.today),
        outside: cn('text-muted-foreground opacity-50', defaultClassNames.outside),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClass, orientation, ...chevronProps }) => {
          if (orientation === 'left') {
            return <ChevronLeft className={cn('h-4 w-4', chevronClass)} {...chevronProps} />;
          }
          return <ChevronRight className={cn('h-4 w-4', chevronClass)} {...chevronProps} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
