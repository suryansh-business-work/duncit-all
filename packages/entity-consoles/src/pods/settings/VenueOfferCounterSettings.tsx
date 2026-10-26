import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import NumberSettingCard from './NumberSettingCard';
import type { PodSettingsSectionProps } from './queries';

/**
 * Venue booking offers — how far a host and a venue may bargain over one
 * booking in the venue chat. One number, the counter offers the booking may
 * carry in all, split equally between the two sides: 6 lets the host counter 3
 * times and the venue 3 times. Even, 2–20, exactly as the server keeps it, so
 * the box refuses anything else rather than saving a number never applied.
 */
export default function VenueOfferCounterSettings({ settings, loading, onSave }: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t('admin.podSettings.venueOfferGroupTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.podSettings.venueOfferGroupDesc')}
        </Typography>
      </Box>
      <NumberSettingCard
        title={t('admin.podSettings.maxCountersTitle')}
        description={t('admin.podSettings.maxCountersDesc')}
        label={t('admin.podSettings.maxCountersLabel')}
        helperText={t('admin.podSettings.maxCountersMin')}
        invalidText={t('admin.podSettings.maxCountersInvalid')}
        min={2}
        max={20}
        step={2}
        loading={loading}
        value={settings?.venue_offer_max_counters ?? null}
        onSave={(next) => onSave({ venue_offer_max_counters: next })}
      />
    </Stack>
  );
}
