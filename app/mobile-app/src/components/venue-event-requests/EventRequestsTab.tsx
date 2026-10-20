import { useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitButton } from '@/components/DuncitButton';
import { AnswerNoteForm, CounterOfferForm } from '@/forms/event-answer';
import { EventRequestResponse } from '@/generated/graphql/graphql';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueEventRequests, type EventRequestRow } from '@/hooks/useVenueEventRequests';
import { EventRequestCard, type EventAnswer } from './EventRequestCard';

const RESPONSE: Record<EventAnswer, EventRequestResponse> = {
  ACCEPT: EventRequestResponse.Accept,
  REJECT: EventRequestResponse.Reject,
  COUNTER: EventRequestResponse.Counter,
};

/**
 * The live inbox: every workshop/event request members sent the owner's
 * venues, with Accept, Reject and Counter offer. The answer goes to the
 * server, which notifies the member and, for an offer, freezes the price.
 */
export function EventRequestsTab() {
  const { t } = useTranslation();
  const inbox = useVenueEventRequests();
  const [answering, setAnswering] = useState<{
    request: EventRequestRow;
    kind: EventAnswer;
  } | null>(null);
  const close = () => setAnswering(null);
  const respond = (offer: Parameters<typeof inbox.respond>[3], note: string) => {
    if (!answering) return;
    inbox
      .respond(answering.request.id, RESPONSE[answering.kind], note, offer)
      .then((ok) => ok && close())
      .catch(() => undefined);
  };

  return (
    <YStack gap={16} testID="event-requests-tab">
      {inbox.feedback ? (
        <Text
          role="button"
          hitSlop={12}
          pressStyle={PRESS_STYLE.inline}
          fontSize={13}
          color={inbox.feedback.ok ? '$success' : '$danger'}
          onPress={inbox.clearFeedback}
          aria-live="polite"
          testID="event-request-feedback"
        >
          {inbox.feedback.text}
        </Text>
      ) : null}
      {inbox.error ? (
        <Text role="alert" testID="event-requests-error" fontSize={13} color="$danger">
          {inbox.error}
        </Text>
      ) : null}
      {inbox.isLoading ? (
        <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
      ) : null}
      {!inbox.isLoading && !inbox.error && inbox.rows.length === 0 ? (
        <Text testID="event-requests-empty" fontSize={14} color="$muted" textAlign="center">
          {t('availability.eventInbox.empty')}
        </Text>
      ) : null}
      {inbox.rows.map((request) => (
        <EventRequestCard
          key={request.id}
          request={request}
          busy={inbox.busy}
          onAnswer={(row, kind) => setAnswering({ request: row, kind })}
        />
      ))}
      {inbox.hasMore ? (
        <XStack justifyContent="center">
          <DuncitButton
            testID="event-requests-load-more"
            label={t('availability.eventInbox.loadMore')}
            onPress={inbox.loadMore}
            variant="outline"
            tone="neutral"
          />
        </XStack>
      ) : null}

      {answering && answering.kind !== 'COUNTER' ? (
        <AnswerNoteForm
          open
          kind={answering.kind}
          busy={inbox.busy}
          onClose={close}
          onSend={(note) => respond(null, note)}
        />
      ) : null}
      {answering?.kind === 'COUNTER' ? (
        <CounterOfferForm
          venueId={answering.request.target_id}
          busy={inbox.busy}
          onClose={close}
          onSend={(offer, note) => respond(offer, note)}
        />
      ) : null}
    </YStack>
  );
}
