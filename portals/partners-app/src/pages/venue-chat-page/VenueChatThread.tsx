import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Card, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import {
  OfferChatCard,
  SeenFaces,
  VenueChatLineDialogs,
  VenueOfferPinnedBar,
  isOfferChatLine,
  useChatVenueOffer,
  useMarkReadWhileVisible,
  useVenueChatLineActions,
  type OfferSubject,
} from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { useUserData } from '@duncit/user-context';
import { seenByOtherSide, seenFacesByLine, type VenueChatReadMark, type VenueChatSide } from '@duncit/utils';
import ChatComposer from './chat-composer';
import VenueChatBubble from './VenueChatBubble';
import { useVenueChatThread } from './useVenueChatThread';
import { venueChatErrorKey } from './queries';

interface Props {
  podId: string;
  /** The reader's side (`venueChatRoom.my_side`): the venue here, or a host who also owns it. */
  side: VenueChatSide;
  /** The pod and venue an answer names. */
  subject: OfferSubject;
  /** A free pod: its host settles the venue directly, so offer lines name no money. */
  podIsFree?: boolean;
  /** How far every other member has read the thread (`venueChatRoom.read_marks`, re-read with the room). */
  marks: readonly VenueChatReadMark[];
}

/**
 * The booking offer pinned on top (where it stands, the counters each side has
 * left), the message list (oldest first, kept scrolled to the newest) and the
 * composer. Each OFFER line is the offer's card, answerable on the move still
 * waiting on the reader; every line carries its time, its reactions and the
 * faces of whoever has read that far, and the owner's own lines can be edited or
 * deleted. The thread is marked read whenever a new line from the host arrives
 * while the owner is looking at it.
 */
export default function VenueChatThread({ podId, side, subject, podIsFree = false, marks }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useUserData();
  const thread = useVenueChatThread(podId);
  const offers = useChatVenueOffer(podId, thread.lines, !thread.loading);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const actions = useVenueChatLineActions({ onLine: thread.putLine, onRemoved: thread.removeLine, onError: setNotice });
  const meId = user?.user_id ?? '';
  const faces = useMemo(() => seenFacesByLine(thread.lines, marks, meId), [thread.lines, marks, meId]);
  useMarkReadWhileVisible(podId, thread.lines, meId, actions.markRead);
  // The list grows with the page (no inner scroll box, so keyboard and screen
  // reader users scroll it like any page); a new line brings the newest into view.
  const endRef = useRef<HTMLDivElement>(null);
  const answering = { live: offers.offer, subject, onAnswered: offers.refresh };

  useEffect(() => {
    if (thread.lines.length > 0) endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [thread.lines.length]);

  const retry = () =>
    fireAndForget(thread.retry(), logs.portal['partners-app'], 'VenueChatPage', 'VenueChatThread.retry');

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <VenueOfferPinnedBar offer={offers.offer} side={side} />
      {thread.error && (
        <Alert severity="error" sx={{ my: 1.5 }} action={<DuncitButton onClick={retry}>{t('shell.common.retry')}</DuncitButton>}>
          {t(venueChatErrorKey(thread.error))}
        </Alert>
      )}
      {notice && (
        <Alert severity="error" sx={{ my: 1.5 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {thread.loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
        </Box>
      )}
      {!thread.loading && !thread.error && thread.lines.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          {t('mweb.venueChat.emptyVenue')}
        </Typography>
      )}
      {thread.lines.length > 0 && (
        <Stack component="ul" role="log" aria-live="polite" aria-label={t('partners.venueChat.messagesLabel')} spacing={1.25} sx={{ m: 0, mt: 1, p: 0.5 }}>
          {thread.lines.map((line) =>
            isOfferChatLine(line) ? (
              <Box component="li" key={line.id} sx={{ listStyle: 'none' }}>
                <OfferChatCard
                  move={line.offer}
                  viewer={side}
                  newest={line.id === offers.newestId}
                  answering={answering}
                  podIsFree={podIsFree}
                  line={line}
                  viewerId={meId}
                  onReact={(emoji) => actions.react(line.id, emoji)}
                  seen={seenByOtherSide(line, marks, side)}
                />
                <SeenFaces marks={faces.get(line.id)} />
              </Box>
            ) : (
              <VenueChatBubble
                key={line.id}
                line={line}
                mine={line.user_id === meId}
                viewerId={meId}
                onReact={(emoji) => actions.react(line.id, emoji)}
                onEdit={() => setEditing({ id: line.id, text: line.text ?? '' })}
                onDelete={() => setDeletingId(line.id)}
                seenBy={faces.get(line.id)}
              />
            ),
          )}
        </Stack>
      )}
      <div ref={endRef} />
      <Divider sx={{ my: 1.5 }} />
      <ChatComposer sending={thread.sending} onSend={thread.sendText} />
      <VenueChatLineDialogs
        editing={editing}
        deletingId={deletingId}
        actions={actions}
        error={notice}
        onClose={() => {
          setEditing(null);
          setDeletingId(null);
        }}
      />
    </Card>
  );
}
