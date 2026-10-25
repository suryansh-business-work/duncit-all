import { useId } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import { useTranslation } from '@duncit/app-settings';
import { venueChatOfferTitleKey, type VenueChatOfferMove } from '@duncit/utils';
import OfferChatActions, { type OfferChatAnswering } from './OfferChatActions';
import OfferMoveDetails from './OfferMoveDetails';
import { isOpenMove, titleSideOf, type OfferChatViewer } from './chat-lines';

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
}

/**
 * One move of a booking offer as a card in the pod's venue chat — "The venue
 * countered", "You accepted — booking confirmed" — with the terms it carried
 * and, on the move still waiting on the reader, their answers. Draw it only for
 * a line `isOfferChatLine` accepts; any other line keeps its text bubble.
 */
export default function OfferChatCard({ move, viewer, newest, answering, podIsFree }: Readonly<Props>) {
  const { t } = useTranslation();
  const headingId = useId();
  const mine = move.by === viewer;
  // Only the venue reads the money as "You receive"; a host and staff read what it costs the pod.
  const money = viewer === 'VENUE' ? 'VENUE' : 'HOST';

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
          <Typography id={headingId} component="h3" variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t(venueChatOfferTitleKey(move, titleSideOf(viewer, move.by)))}
          </Typography>
        </Stack>
        <OfferMoveDetails move={move} money={money} open={newest && isOpenMove(move.event)} podIsFree={podIsFree} />
        {answering && viewer !== 'STAFF' && <OfferChatActions move={move} side={viewer} newest={newest} answering={answering} podIsFree={podIsFree} />}
      </Stack>
    </Paper>
  );
}
