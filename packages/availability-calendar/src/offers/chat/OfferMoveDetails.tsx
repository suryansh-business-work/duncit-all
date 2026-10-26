import { Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { slotSpanLabel } from '@duncit/slots';
import type { VenueChatOfferMove } from '@duncit/utils';
import { offerGuestsLabel, offerTermsLabel } from '../format';
import { OfferAnswerBy, OfferAsk } from '../OfferAsk';
import OfferImages from '../OfferImages';
import OfferMoney from '../OfferMoney';
import type { OfferSide } from '../offer-target';

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Typography variant="body2">
      <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mr: 0.75 }}>
        {label}
      </Typography>
      {value}
    </Typography>
  );
}

interface Props {
  move: VenueChatOfferMove;
  /** How the money reads: VENUE "You receive …"; HOST and staff what it costs the pod. */
  money: OfferSide;
  /** Still waiting on an answer — the answer-by time shows. */
  open: boolean;
  /** A free pod: its host settles the venue directly, so the move names no money. */
  podIsFree?: boolean;
}

/**
 * The terms one move of the offer carried, as they stood: how the venue is
 * paid, for how many guests, when and where, pets, the money as a range, what
 * the venue is asked to provide, the note, the photos attached, why it was
 * declined, and until when it may be answered.
 */
export default function OfferMoveDetails({ move, money, open, podIsFree = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const guests = offerGuestsLabel(t, move.min_guests, move.max_guests);
  const when = slotSpanLabel(move.start_at, move.end_at, false, fmt, t('availability.wholeDay'));
  const range = { venueMin: move.venue_receives_min, venueMax: move.venue_receives_max, totalMin: move.total_min, totalMax: move.total_max };

  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" sx={{ fontWeight: 700 }} data-testid="offer-move-terms">
        {offerTermsLabel(t, move.model, move.rate)}
      </Typography>
      <Fact label={t('availability.offers.guestsLabel')} value={move.pets ? `${guests} · ${t('availability.offers.pets')}` : guests} />
      <Fact label={t('availability.offers.when')} value={when} />
      <Fact label={t('availability.offers.space')} value={move.space_label || t('availability.offers.wholeVenue')} />
      {podIsFree ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="offer-move-free">
          {money === 'VENUE' ? t('availability.offers.freePod') : t('availability.offers.hostAnswer.freePod')}
        </Typography>
      ) : (
        <OfferMoney side={money} range={range} />
      )}
      <OfferAsk offerings={move.offerings} note={move.note} by={move.by} />
      <OfferImages images={move.images} />
      {move.event === 'DECLINED' && move.reason && (
        <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }} data-testid="offer-move-reason">
          {t('availability.offers.chat.reason', { vars: { reason: move.reason } })}
        </Typography>
      )}
      {open && <OfferAnswerBy at={move.expires_at} />}
    </Stack>
  );
}
