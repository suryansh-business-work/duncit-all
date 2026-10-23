import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  formatStatementMoney,
  hostMayAnswerCounter,
  parseApiError,
  venueOfferStatusKey,
  venueOfferTermsText,
} from '@duncit/utils';

import { ReasonSheet } from '@/components/challenge/host/ReasonSheet';
import { VenueQuoteCard } from '@/components/create-pod/steps/VenueSlotStep/VenueQuoteCard';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { usePodVenueOffer } from '@/hooks/usePodVenueOffer';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  podId: string;
  currencySymbol: string;
  /** Re-reads the screen once the host answers (the pod goes live or venue-declined). */
  onAnswered: () => void;
}

/**
 * The host's offer to the venue: where it stands, the terms sent, and — when
 * the venue countered — its terms priced, with Accept (the pod goes live at
 * that price) and Reject (the hold is released, the pod can be resubmitted).
 * Nothing for a pod with no offer. mWeb twin: VenueOfferCard.
 */
export function VenueOfferCard({ podId, currencySymbol, onAnswered }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (rupees: number) => formatStatementMoney(rupees, currencySymbol);
  const { offer, busy, error, accept, reject } = usePodVenueOffer(podId);
  const [rejecting, setRejecting] = useState(false);
  if (!offer) return null;

  const afterAnswer = (ok: boolean) => {
    if (ok) onAnswered();
  };

  return (
    <SurfaceCard testID="venue-offer-card" gap={10}>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={16} fontWeight="600" color="$color">
          {t('mweb.venueOffer.title')}
        </Text>
        <Text testID="venue-offer-status" fontSize={12} fontWeight="700" color="$primary">
          {t(venueOfferStatusKey(offer.status) || 'mweb.venueOffer.status.sent')}
        </Text>
      </XStack>
      <Text testID="venue-offer-terms" fontSize={13} color="$color">
        {t('mweb.venueOffer.yourTerms', {
          vars: { terms: venueOfferTermsText(offer.model, offer.rate, t, money) },
        })}
      </Text>
      {offer.counter ? (
        <YStack gap={8} testID="venue-offer-counter">
          <Text fontSize={13} fontWeight="700" color="$color">
            {t('mweb.venueOffer.counterTerms', {
              vars: {
                terms: venueOfferTermsText(offer.counter.model, offer.counter.rate, t, money),
              },
            })}
          </Text>
          {offer.counter.note ? (
            <Text fontSize={13} color="$muted">
              {t('mweb.venueOffer.counterNote', { vars: { note: offer.counter.note } })}
            </Text>
          ) : null}
          <VenueQuoteCard
            quote={offer.counter.quote}
            loading={false}
            error={null}
            currencySymbol={currencySymbol}
          />
        </YStack>
      ) : null}
      {hostMayAnswerCounter(offer) ? (
        <XStack gap={8}>
          <DuncitButton
            testID="venue-offer-accept"
            label={t('mweb.venueOffer.accept')}
            loading={busy}
            onPress={() => {
              accept()
                .then(afterAnswer)
                .catch(() => undefined);
            }}
          />
          <DuncitButton
            testID="venue-offer-reject"
            label={t('mweb.venueOffer.reject')}
            variant="outline"
            disabled={busy}
            onPress={() => setRejecting(true)}
          />
        </XStack>
      ) : null}
      {error ? (
        <Text role="alert" fontSize={13} color="$danger">
          {parseApiError(error, t('mweb.venueOffer.answerFailed'))}
        </Text>
      ) : null}
      <ReasonSheet
        open={rejecting}
        title={t('mweb.venueOffer.rejectTitle')}
        message={t('mweb.venueOffer.rejectMessage')}
        confirmLabel={t('mweb.venueOffer.reject')}
        required={false}
        busy={busy}
        onClose={() => setRejecting(false)}
        onSubmit={(reason) => {
          reject(reason)
            .then((ok) => {
              if (ok) setRejecting(false);
              afterAnswer(ok);
            })
            .catch(() => undefined);
        }}
      />
    </SurfaceCard>
  );
}
