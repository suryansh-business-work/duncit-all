import { Box, Checkbox, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { SpaceRow } from './useRecurringDialog';

interface Props {
  spaces: SpaceRow[];
  onChange: (next: SpaceRow[]) => void;
}

/** Pricing by capacity — each venue space gets its own price + capacity and
 * creates its own slots. A single unnamed row means the whole venue. */
export default function SpacePricingSection({ spaces, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const setRow = (label: string, p: Partial<SpaceRow>) =>
    onChange(spaces.map((s) => (s.label === label ? { ...s, ...p } : s)));
  // The include toggle only makes sense when there are named spaces to choose from.
  const showToggle = spaces.length > 1 || spaces.some((s) => s.label !== '');
  const spaceName = (space: SpaceRow) => space.label || t('availability.wholeVenue');

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.25 }}>
        {t('availability.recurring.pricingBySpace')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('availability.recurring.pricingBySpaceHint')}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {spaces.map((space) => (
          <Stack key={space.label || 'whole-venue'} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {showToggle && (
              <Checkbox
                size="small"
                checked={space.enabled}
                onChange={(e) => setRow(space.label, { enabled: e.target.checked })}
                slotProps={{
                  input: {
                    'aria-label': t('availability.recurring.includeSpace', { vars: { space: spaceName(space) } }),
                  },
                }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {spaceName(space)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('availability.recurring.capacity', { vars: { capacity: space.capacity } })}
              </Typography>
            </Box>
            <TextField
              label={t('availability.price')}
              type="number"
              size="small"
              value={space.price}
              disabled={!space.enabled}
              onChange={(e) => setRow(space.label, { price: e.target.value })}
              sx={{ maxWidth: 150 }}
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: 50,
                  'aria-label': t('availability.recurring.spacePrice', { vars: { space: spaceName(space) } }),
                },
              }}
            />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
