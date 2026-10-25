import { useEffect, useRef } from 'react';
import { Alert, Box, Card, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { OfferChatCard, isOfferChatLine, useChatVenueOffer, type OfferSubject } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { useUserData } from '@duncit/user-context';
import type { VenueChatSide } from '@duncit/utils';
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
}

/**
 * The message list (oldest first, kept scrolled to the newest) and the
 * composer. Each OFFER line is the offer's card, answerable on the move still
 * waiting on the reader; the live offer is re-read when a poll brings a new one.
 */
export default function VenueChatThread({ podId, side, subject, podIsFree = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useUserData();
  const thread = useVenueChatThread(podId);
  const offers = useChatVenueOffer(podId, thread.lines, !thread.loading);
  // The list grows with the page (no inner scroll box, so keyboard and screen
  // reader users scroll it like any page); a new line brings the newest into view.
  const endRef = useRef<HTMLDivElement>(null);
  const meId = user?.user_id ?? '';
  const answering = { live: offers.offer, subject, onAnswered: offers.refresh };

  useEffect(() => {
    if (thread.lines.length > 0) endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [thread.lines.length]);

  const retry = () =>
    fireAndForget(thread.retry(), logs.portal['partners-app'], 'VenueChatPage', 'VenueChatThread.retry');

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      {thread.error && (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          action={<DuncitButton onClick={retry}>{t('shell.common.retry')}</DuncitButton>}
        >
          {t(venueChatErrorKey(thread.error))}
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
        <Stack
          component="ul"
          role="log"
          aria-live="polite"
          aria-label={t('partners.venueChat.messagesLabel')}
          spacing={1.25}
          sx={{ m: 0, p: 0.5 }}
        >
          {thread.lines.map((line) =>
            isOfferChatLine(line) ? (
              <Box component="li" key={line.id} sx={{ listStyle: 'none', display: 'flex' }}>
                <OfferChatCard
                  move={line.offer}
                  viewer={side}
                  newest={line.id === offers.newestId}
                  answering={answering}
                  podIsFree={podIsFree}
                />
              </Box>
            ) : (
              <VenueChatBubble key={line.id} line={line} mine={line.user_id === meId} />
            ),
          )}
        </Stack>
      )}
      <div ref={endRef} />
      <Divider sx={{ my: 1.5 }} />
      <ChatComposer sending={thread.sending} onSend={thread.sendText} />
    </Card>
  );
}
