import * as React from 'react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function parseYmd(value: string): Date | undefined {
  if (!value.trim()) return undefined;
  try {
    return parse(value, 'yyyy-MM-dd', new Date());
  } catch {
    return undefined;
  }
}

export interface DatePickerFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePickerField({
  id,
  value,
  onChange,
  placeholder = 'Elegir fecha',
  disabled,
  className,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseYmd(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? format(selected, 'PPP', { locale: es }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
