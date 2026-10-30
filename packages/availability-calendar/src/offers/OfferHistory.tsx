import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { isFreeVenueOfferModel, venueOfferHistoryKey } from '@duncit/utils';
import type { Translate } from '../pricing/types';
import { offerTermsLabel } from './format';
import type { OfferHistoryEntry } from './queries';

/** A step's terms — "Per guest · ₹300 per guest · at least 12 guests", "Free venue" — or '' for a step without terms. */
function stepTerms(t: Translate, entry: OfferHistoryEntry): string {
  if (!entry.model) return '';
  // A free venue names no amount: its terms are just "Free venue".
  if (isFreeVenueOfferModel(entry.model)) return offerTermsLabel(t, entry.model, 0);
  if (!entry.rate) return '';
  const terms = offerTermsLabel(t, entry.model, entry.rate);
  return entry.min_guests ? `${terms} · ${t('availability.offers.history.minGuests', { vars: { n: entry.min_guests } })}` : terms;
}

/** Every step of the negotiation, oldest first: who offered, countered, accepted or said no — the fewest guests named, and any note. */
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
        {steps.map((entry, index) => (
          <Box component="li" key={`${entry.by}-${entry.action}-${entry.at ?? index}`}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {t(venueOfferHistoryKey(entry), { vars: { terms: stepTerms(t, entry) } })}
              {entry.at ? ` · ${fmt.formatDateTime(entry.at)}` : ''}
            </Typography>
            {entry.note && (
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                {t('availability.offers.history.note', { vars: { note: entry.note } })}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
