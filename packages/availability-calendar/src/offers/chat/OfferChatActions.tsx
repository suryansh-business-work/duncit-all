import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { venueChatOfferActions, type VenueChatOfferMove, type VenueChatSide } from '@duncit/utils';
import HostOfferActions, { type OfferSubject } from '../host/HostOfferActions';
import type { PodOffer } from '../host/queries';
import OfferDecisionActions from '../OfferDecisionActions';
import type { OfferRequestSummary } from '../queries';

/** What a thread's member needs to act on its offer lines. */
export interface OfferChatAnswering {
  /** The pod's live offer (`useChatVenueOffer`); null when it has none (declined, ran out). */
  live: PodOffer | null;
  subject: OfferSubject;
  /** Re-reads the live offer after any answer. */
  onAnswered: () => unknown;
  /** A host sends a new offer after one was declined or ran out; left out, the button is not offered. */
  onSendNewOffer?: (move: VenueChatOfferMove) => void;
}

interface Props {
  move: VenueChatOfferMove;
  side: VenueChatSide;
  /** The thread's newest offer line — the only one that may still be answered. */
  newest: boolean;
  answering: OfferChatAnswering;
  /** A free pod: the venue's accept names no amount. */
  podIsFree?: boolean;
}

/** The venue's booking, as its Accept / Counter / Reject answers name it. */
const requestOf = (subject: OfferSubject, live: PodOffer, podIsFree: boolean): OfferRequestSummary => ({
  slot_id: live.slot_id,
  venue_name: subject.venue_name,
  start_at: live.start_at,
  end_at: live.end_at,
  pod_title: subject.pod_title,
  pod_is_free: podIsFree,
  price: 0,
});

/**
 * What an offer line lets its reader do: answer the move still waiting on them
 * — the venue with Accept / Counter / Reject, the host with Accept / Reject /
 * Counter back — or, for a host, send a new offer once the last one closed.
 * Every older line is a record and offers nothing.
 */
export default function OfferChatActions({ move, side, newest, answering, podIsFree = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { live, subject, onAnswered, onSendNewOffer } = answering;
  const actions = venueChatOfferActions(move, { side, newest, live });

  if (actions.answer && live) {
    return side === 'VENUE' ? (
      <OfferDecisionActions request={requestOf(subject, live, podIsFree)} offer={live} onDone={onAnswered} />
    ) : (
      <HostOfferActions offer={live} subject={subject} onDone={onAnswered} />
    );
  }
  if (!actions.sendNew || !onSendNewOffer) return null;
  return (
    <DuncitButton
      variant="outlined"
      startIcon={<SendRoundedIcon />}
      onClick={() => onSendNewOffer(move)}
      sx={{ alignSelf: 'flex-start' }}
      data-testid="offer-send-new"
    >
      {t('availability.offers.chat.sendNew')}
    </DuncitButton>
  );
}
