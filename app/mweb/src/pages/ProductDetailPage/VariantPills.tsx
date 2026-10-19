import { Chip, Stack } from '@mui/material';
import { IDLE_PILL_SX, PILL_SX } from './productDetailStyles';

/** What a variant pill reads from a product variant. */
export interface VariantChoice {
  id: string;
  option_label?: string | null;
  color?: string | null;
  size_label?: string | null;
}

export const variantName = (v: Omit<VariantChoice, 'id'>): string =>
  v.option_label || v.color || v.size_label || 'Variant';

interface Props {
  variants: VariantChoice[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

/** The product's variant pills — the picked one filled; picking swaps the shown price, stock and images. */
export default function VariantPills({ variants, selectedId, onSelect }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      {variants.map((v) => {
        const selected = selectedId === v.id;
        return (
          <Chip
            key={v.id}
            data-testid={`variant-${v.id}`}
            label={variantName(v)}
            onClick={() => onSelect(v.id)}
            aria-pressed={selected}
            color={selected ? 'primary' : 'default'}
            sx={selected ? PILL_SX : IDLE_PILL_SX}
          />
        );
      })}
    </Stack>
  );
}
