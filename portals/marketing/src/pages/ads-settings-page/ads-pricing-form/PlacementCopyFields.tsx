import type { Control } from 'react-hook-form';
import { Grid, Paper, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { AD_POSITIONS } from '../../../lib/ad-positions';
import type { AdsPricingFormValues } from './ads-pricing.types';
import { useTranslation } from '@duncit/app-settings';

/**
 * What each placement is called on the public rate card, and the line under it.
 *
 * These used to live in two places at once — the server named the placements
 * and the marketing site kept its own table of descriptions beside them — so
 * renaming one meant deploying both, and for a while they disagreed. Left
 * blank, a field falls back to the shipped wording rather than emptying the
 * card, which is what makes clearing it an undo.
 */
export default function PlacementCopyFields({
  control,
}: Readonly<{ control: Control<AdsPricingFormValues> }>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="subtitle2">{t('marketing.adsSettings.rateCardWording')}</Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          What advertisers read on duncit.com. Leave a field empty to use the default.
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {AD_POSITIONS.map((placement, index) => (
          <Grid key={placement.position} size={12}>
            <Grid container spacing={2}>
              <Grid
                size={{
                  xs: 12,
                  sm: 4
                }}>
                <RhfTextField
                  control={control}
                  name={`placements.${index}.label`}
                  label={`${placement.label} — name`}
                  hint="Shown as the placement's title"
                />
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 8
                }}>
                <RhfTextField
                  control={control}
                  name={`placements.${index}.note`}
                  label={`${placement.label} — description`}
                  hint="One line under the name on the rate table"
                />
              </Grid>
            </Grid>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
