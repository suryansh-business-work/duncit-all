import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { venueOfferHistoryKey } from '@duncit/utils';
import { offerTermsLabel } from './format';
import type { OfferHistoryEntry } from './queries';

/** Every step of the negotiation, oldest first: who offered, countered, accepted or said no — and any note. */
export default function OfferHistory({ history }: Readonly<{ history: readonly OfferHistoryEntry[] }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const steps = history.filter((entry) => venueOfferHistoryKey(entry));
  if (steps.length === 0) return null;

  return (
    <Stack spacing={0.5} data-testid="offer-history">
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800 }}>
        {t('availability.offers.history.title')}
      </Typography>
      <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
        {steps.map((entry, index) => {
          const terms = entry.model && entry.rate ? offerTermsLabel(t, entry.model, entry.rate) : '';
          return (
            <Box component="li" key={`${entry.by}-${entry.action}-${entry.at ?? index}`}>
              <Typography variant="caption" sx={{ display: 'block' }}>
                {t(venueOfferHistoryKey(entry), { vars: { terms } })}
                {entry.at ? ` · ${fmt.formatDateTime(entry.at)}` : ''}
              </Typography>
              {entry.note && (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  {t('availability.offers.history.note', { vars: { note: entry.note } })}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
