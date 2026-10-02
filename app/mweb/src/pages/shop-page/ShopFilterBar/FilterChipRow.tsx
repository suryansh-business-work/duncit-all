import { Box, Chip, Stack } from '@mui/material';

export type Option = readonly [string, string];

const railSx = { overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } } as const;

/** The same filter pill as Home's FilterBar and the native FilterChip: 32 tall
 * on touch too (a clickable Chip is a role=button, which the coarse-pointer
 * rule would otherwise stretch to 44); idle = outlined surface, picked = green. */
const CHIP_SX = { height: 32, minHeight: 32, fontWeight: 600, flex: '0 0 auto' } as const;

/** A horizontally-scrollable chip row for a single filter dimension. */
export default function FilterChipRow({
  options,
  value,
  onSelect,
  idPrefix,
}: Readonly<{ options: readonly Option[]; value: string; onSelect: (v: string) => void; idPrefix: string }>) {
  return (
    <Box sx={railSx}>
      <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
        {options.map(([val, label]) => {
          const selected = value === val;
          return (
            <Chip
              key={val || 'all'}
              data-testid={`${idPrefix}-${val || 'all'}`}
              label={label}
              clickable
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              aria-pressed={selected}
              onClick={() => onSelect(val)}
              sx={CHIP_SX}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

export const withAll = (options: Option[]): Option[] => [['', 'All'], ...options];
