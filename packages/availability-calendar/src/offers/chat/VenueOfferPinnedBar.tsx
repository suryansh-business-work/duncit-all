import { Chip, Paper, Stack, Typography } from '@mui/material';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { venueOfferPin, type PinnedOfferSource, type VenueChatSide } from '@duncit/utils';

interface Props {
  /** The pod's live offer; null when it has none (declined or ran out — there is nothing to pin). */
  offer: PinnedOfferSource | null;
  /** The reader's side. */
  side: VenueChatSide;
}

/**
 * The bar pinned to the top of a venue chat: where the booking offer stands —
 * your move, waiting on them, confirmed — until when it must be answered, and
 * how many counters each side has left of its share.
 */
export default function VenueOfferPinnedBar({ offer, side }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const pin = venueOfferPin(offer, side);
  if (!pin) return null;
  const theirsKey = side === 'HOST' ? 'availability.offers.pin.venue' : 'availability.offers.pin.host';
  const counters = [
    pin.mine && t('availability.offers.pin.mine', { vars: { left: pin.mine.left, of: pin.mine.of } }),
    pin.theirs && t(theirsKey, { vars: { left: pin.theirs.left, of: pin.theirs.of } }),
  ].filter(Boolean);
  const yourMove = pin.open && pin.statusKey === 'availability.offers.pin.yourMove';

  return (
    <Paper
      square
      elevation={0}
      role="status"
      aria-label={t('availability.offers.pin.title')}
      data-testid="venue-offer-pin"
      sx={{ position: 'sticky', top: 0, zIndex: 1, px: { xs: 1.25, sm: 2 }, py: 1, borderBottom: 1, borderColor: 'divider' }}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <PushPinOutlinedIcon fontSize="small" color="primary" aria-hidden />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('availability.offers.pin.title')}
        </Typography>
        {pin.statusKey && (
          <Chip size="small" color={yourMove ? 'warning' : 'default'} label={t(pin.statusKey)} data-testid="venue-offer-pin-status" />
        )}
        {pin.expiresAt && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('availability.offers.answerBy', { vars: { date: fmt.formatDateTime(pin.expiresAt) } })}
          </Typography>
        )}
      </Stack>
      {pin.open && counters.length > 0 && (
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary', fontWeight: 700, m: 0, mt: 0.25 }} data-testid="venue-offer-pin-counters">
          {counters.join(' · ')}
        </Typography>
      )}
    </Paper>
  );
}
