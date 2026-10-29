import { useId } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { venueChatOfferTitleKey, type VenueChatLine, type VenueChatOfferMove } from '@duncit/utils';
import type { PodOffer } from '../host/queries';
import LineReactions from './LineReactions';
import OfferChatActions, { type OfferChatAnswering } from './OfferChatActions';
import OfferMoveDetails from './OfferMoveDetails';
import { isOpenMove, titleSideOf, type OfferChatViewer } from './chat-lines';

/** The host's reason for asking the venue free, on that offer's own line: the live offer carries it, the line does not. */
const freeReasonOf = (move: VenueChatOfferMove, live: PodOffer | null | undefined) =>
  live && live.slot_id === move.slot_id && move.event === 'OFFER' ? live.free_justification : null;

interface Props {
  move: VenueChatOfferMove;
  /** Who reads the thread: a host, the venue, or Duncit staff (a record only). */
  viewer: OfferChatViewer;
  /** The thread's newest offer line: only it may still be answered, and only it shows an answer-by time. */
  newest: boolean;
  /** How a member acts on it; left out (staff), the card offers nothing. */
  answering?: OfferChatAnswering;
  /** A free pod (the room says so): the host settles the venue directly, so no money is shown. */
  podIsFree?: boolean;
  /** The line the move was posted as: when (shown as its date and time), whether it was edited, its reactions. */
  line?: Pick<VenueChatLine, 'createdAt' | 'edited_at' | 'reactions'>;
  /** The reader, so their own reactions show as theirs. */
  viewerId?: string | null;
  /** Reacts to the card; left out, its reactions are a record only. */
  onReact?: (emoji: string) => unknown;
  /** The other side has read the thread this far: the reader's own counter can no longer change. */
  seen?: boolean;
}

/**
 * One move of a booking offer as a card in the pod's venue chat — "The venue
 * countered", "You accepted — booking confirmed" — with when it was made (and
 * whether it was edited since), the terms it carried and, on the move still
 * waiting on the reader, their answers; on their own counter the other side has
 * not seen yet, Edit and Withdraw. Members react to it like any line. Draw it
 * only for a line `isOfferChatLine` accepts; any other line keeps its text bubble.
 */
export default function OfferChatCard({ move, viewer, newest, answering, podIsFree, line, viewerId, onReact, seen }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const headingId = useId();
  const mine = move.by === viewer;
  // Only the venue reads the money as "You receive"; a host and staff read what it costs the pod.
  const money = viewer === 'VENUE' ? 'VENUE' : 'HOST';
  const sentAt = line ? fmt.formatDateTime(line.createdAt) : '';

  return (
    <Paper
      component="article"
      variant="outlined"
      aria-labelledby={headingId}
      data-testid={`offer-line-${move.slot_id}-${move.round}-${move.event}`}
      sx={{
        p: 1.5,
        my: 0.75,
        width: '100%',
        maxWidth: 440,
        ml: mine ? 'auto' : 0,
        bgcolor: 'background.paper',
        borderColor: 'primary.main',
        borderLeftWidth: 4,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <HandshakeOutlinedIcon color="primary" fontSize="small" aria-hidden />
          <Typography id={headingId} component="h3" variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>
            {t(venueChatOfferTitleKey(move, titleSideOf(viewer, move.by)))}
          </Typography>
        </Stack>
        {line && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="offer-line-time">
            <time dateTime={line.createdAt}>{t('availability.offers.chat.sentAt', { vars: { time: sentAt } })}</time>
            {line.edited_at ? ` · ${t('availability.offers.chat.edited')}` : ''}
          </Typography>
        )}
        <OfferMoveDetails
          move={move}
          money={money}
          open={newest && isOpenMove(move.event)}
          podIsFree={podIsFree}
          freeJustification={freeReasonOf(move, answering?.live)}
        />
        {answering && viewer !== 'STAFF' && (
          <OfferChatActions move={move} side={viewer} newest={newest} answering={answering} podIsFree={podIsFree} seen={seen} />
        )}
        {line && <LineReactions reactions={line.reactions} viewerId={viewerId} onReact={onReact} alignEnd={mine} />}
      </Stack>
    </Paper>
  );
}
