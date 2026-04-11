import { forwardRef, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Producto } from '@/types/electron';

export type ProductoComboboxProps = {
  value: number;
  onChange: (productoId: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  productos: Producto[];
  placeholder?: string;
} & Pick<
  React.ComponentProps<'button'>,
  'id' | 'name' | 'aria-invalid' | 'aria-describedby' | 'className'
>;

function productoLabel(p: Producto): string {
  const extra = p.status !== 'ACTIVE' ? ' · inactivo' : '';
  return `${p.sku} · ${p.nombre} · $${p.precioVenta.toFixed(2)} (stock ${p.stockActual}${extra})`;
}

export const ProductoCombobox = forwardRef<HTMLButtonElement, ProductoComboboxProps>(
  function ProductoCombobox(
    {
      value,
      onChange,
      onBlur,
      disabled,
      productos,
      placeholder = 'Elegir producto…',
      className,
      id,
      name,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);

    const selected = value > 0 ? productos.find((p) => p.id === value) : undefined;
    const fallbackLabel = value > 0 && !selected ? `Producto #${value} (revisa catálogo)` : '';

    /** Solo con stock; se mantiene el elegido aunque quede en 0 (p. ej. al editar una venta). */
    const listable = useMemo(
      () => productos.filter((p) => p.stockActual > 0 || p.id === value),
      [productos, value],
    );

    const byId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

    const commandFilter = useMemo(() => {
      return (itemValue: string, search: string) => {
        const q = search.trim().toLowerCase();
        if (!q) return 1;
        const idNum = Number(itemValue);
        const p = byId.get(idNum);
        if (!p) return 0;
        return p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) ? 1 : 0;
      };
    }, [byId]);

    const handleSelect = (productoId: number) => {
      onChange(productoId);
      setOpen(false);
    };

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            name={name}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            disabled={disabled || listable.length === 0}
            className={cn('h-9 w-full justify-between font-normal', className)}
          >
            <span className="truncate text-left">
              {listable.length === 0
                ? 'Cargando…'
                : selected
                  ? productoLabel(selected)
                  : fallbackLabel || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          data-venta-producto-popover=""
          className="z-[100] w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command label="Buscar producto" filter={commandFilter} shouldFilter>
            <CommandInput placeholder="Buscar por nombre o SKU…" />
            <CommandList>
              <CommandEmpty>Sin coincidencias.</CommandEmpty>
              <CommandGroup>
                {listable.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={String(p.id)}
                    keywords={[p.sku, p.nombre]}
                    className="flex flex-col items-start gap-0.5 py-2"
                    onSelect={() => handleSelect(p.id)}
                  >
                    <span className="flex w-full items-center gap-2">
                      <Check
                        className={cn('h-4 w-4 shrink-0', value === p.id ? 'opacity-100' : 'opacity-0')}
                      />
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>{' '}
                        <span className="font-medium">{p.nombre}</span>
                      </span>
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">
                      ${p.precioVenta.toFixed(2)} · stock {p.stockActual}
                      {p.status !== 'ACTIVE' ? ' · inactivo' : ''}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

ProductoCombobox.displayName = 'ProductoCombobox';
