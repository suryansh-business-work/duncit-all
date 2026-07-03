import { Box, Checkbox, Stack, TextField, Typography } from '@mui/material';
import type { SpaceRow } from './useRecurringDialog';

interface Props {
  spaces: SpaceRow[];
  onChange: (next: SpaceRow[]) => void;
}

/** Pricing by capacity — each venue space gets its own price + capacity and
 * creates its own slots. A single unnamed row means the whole venue. */
export default function SpacePricingSection({ spaces, onChange }: Readonly<Props>) {
  const setRow = (label: string, p: Partial<SpaceRow>) =>
    onChange(spaces.map((s) => (s.label === label ? { ...s, ...p } : s)));
  // The include toggle only makes sense when there are named spaces to choose from.
  const showToggle = spaces.length > 1 || spaces[0]?.label !== '';

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.25 }}>
        Pricing by space
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Each space is priced separately and creates its own slots (same times, own capacity).
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {spaces.map((space) => (
          <Stack key={space.label || 'whole-venue'} direction="row" spacing={1} alignItems="center">
            {showToggle && (
              <Checkbox
                size="small"
                checked={space.enabled}
                onChange={(e) => setRow(space.label, { enabled: e.target.checked })}
                inputProps={{ 'aria-label': `Include ${space.label || 'whole venue'}` }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {space.label || 'Whole venue'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Capacity {space.capacity}
              </Typography>
            </Box>
            <TextField
              label="Price (₹)"
              type="number"
              size="small"
              value={space.price}
              disabled={!space.enabled}
              onChange={(e) => setRow(space.label, { price: e.target.value })}
              inputProps={{ min: 0, step: 50, 'aria-label': `${space.label || 'Whole venue'} price` }}
              sx={{ maxWidth: 150 }}
            />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
