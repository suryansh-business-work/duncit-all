import { Stack, Typography } from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { formatStatementMoney, venueHostTermLines, type VenueHostTerms } from '@duncit/utils';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * A host's glance at what the venue asks of an offer — "Minimum spend ₹5,000
 * per booking · ₹450 per guest · Paid for at least 10 guests" — under the
 * venue's name on a list card, mounted only for a host (who has terms).
 * Nothing for a venue that sets no minimums. Native twin: VenueCardTerms.
 */
export default function VenueCardTerms({ venueId, terms }: Readonly<{ venueId: string; terms: VenueHostTerms }>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const lines = venueHostTermLines(terms, t, (value) => formatStatementMoney(value, currency), { compact: true });
  if (lines.length === 0) return null;
  const text = lines.map((line) => line.text).join(' · ');
  return (
    <Stack
      direction="row"
      spacing={0.5}
      data-testid={`venue-card-terms-${venueId}`}
      sx={{ alignItems: 'flex-start', pt: 0.25 }}
    >
      <PaymentsOutlinedIcon aria-hidden sx={{ fontSize: 13, mt: '2px', color: 'brand.main' }} />
      <Typography
        variant="caption"
        sx={{
          color: 'text.primary',
          fontWeight: 600,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {text}
      </Typography>
    </Stack>
  );
}
