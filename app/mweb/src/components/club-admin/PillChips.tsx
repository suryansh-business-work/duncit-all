import { Chip, Stack, Typography } from '@mui/material';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for a screen reader — and, when shown, heads the row. */
  label: string;
  showLabel?: boolean;
}

/**
 * A single-choice row of pill chips — the selected one green, the rest on the
 * surface. The dashboard range, the trend series and the pods status filter
 * all pick through it, the same pills the native ChipSelectField draws.
 */
export default function PillChips<T extends string>({
  options,
  value,
  onChange,
  label,
  showLabel = true,
}: Readonly<Props<T>>) {
  return (
    <Stack spacing={1}>
      {showLabel && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      <Stack direction="row" useFlexGap role="group" aria-label={label} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Chip
              key={option.value}
              label={option.label}
              clickable
              aria-pressed={selected}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => onChange(option.value)}
              sx={{ height: 36, minHeight: 36, px: 0.5 }}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
