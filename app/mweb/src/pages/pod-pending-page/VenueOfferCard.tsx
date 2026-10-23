import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatStatementMoney, hostMayAnswerCounter, parseApiError, venueOfferStatusKey, venueOfferTermsText } from '@duncit/utils';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import VenueQuoteCard from '../create-pod-page/create-pod/steps/VenueQuoteCard';
import { ReasonDialog } from '../host-pod-challenges-page/reason-form';
import { ACCEPT_VENUE_COUNTER_OFFER, POD_VENUE_OFFER, REJECT_VENUE_COUNTER_OFFER } from './venueOfferQueries';

const STATUS_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  SENT: 'warning',
  COUNTERED: 'info',
  ACCEPTED: 'success',
  DECLINED: 'error',
};

interface Props {
  podId: string;
  /** Re-reads the page once the host answers (the pod goes live or venue-declined). */
  onAnswered: () => Promise<unknown>;
}

/**
 * The host's offer to the venue: where it stands, the terms sent, and — when
 * the venue countered — its terms priced, with Accept (the pod goes live at
 * that price) and Reject (the hold is released, the pod can be resubmitted).
 * Nothing for a pod with no offer. Native twin: VenueOfferCard.
 */
export default function VenueOfferCard({ podId, onAnswered }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const money = (rupees: number) => formatStatementMoney(rupees, currency);
  const [rejecting, setRejecting] = useState(false);
  const { data, refetch } = useQuery(POD_VENUE_OFFER, { variables: { pod_id: podId }, fetchPolicy: 'cache-and-network' });
  const [accept, accepting] = useMutation(ACCEPT_VENUE_COUNTER_OFFER);
  const [reject, declining] = useMutation(REJECT_VENUE_COUNTER_OFFER);
  const offer = data?.podVenueOffer;
  if (!offer) return null;

  const answered = async () => {
    await Promise.all([refetch(), onAnswered()]);
  };
  // A refused answer stays on the card: the mutation's error renders below.
  const doAccept = async () => {
    try {
      await accept({ variables: { pod_id: podId } });
      await answered();
    } catch {
      // Shown below from accepting.error.
    }
  };
  const doReject = async ({ reason }: { reason: string }) => {
    try {
      await reject({ variables: { pod_id: podId, reason: reason.trim() || null } });
      setRejecting(false);
      await answered();
    } catch {
      // Shown below from declining.error.
    }
  };
  const actionError = accepting.error ?? declining.error;
  const busy = accepting.loading || declining.loading;

  return (
    <Card variant="outlined" sx={{ p: 2 }} data-testid="venue-offer-card">
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {t('mweb.venueOffer.title')}
          </Typography>
          <Chip
            size="small"
            color={STATUS_COLOR[offer.status] ?? 'default'}
            label={t(venueOfferStatusKey(offer.status) || 'mweb.venueOffer.status.sent')}
            data-testid="venue-offer-status"
          />
        </Stack>
        <Typography variant="body2" data-testid="venue-offer-terms">
          {t('mweb.venueOffer.yourTerms', { vars: { terms: venueOfferTermsText(offer.model, offer.rate, t, money) } })}
        </Typography>
        {offer.counter && (
          <Stack spacing={1} data-testid="venue-offer-counter">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('mweb.venueOffer.counterTerms', { vars: { terms: venueOfferTermsText(offer.counter.model, offer.counter.rate, t, money) } })}
            </Typography>
            {offer.counter.note && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('mweb.venueOffer.counterNote', { vars: { note: offer.counter.note } })}
              </Typography>
            )}
            <VenueQuoteCard quote={offer.counter.quote} loading={false} error={null} />
          </Stack>
        )}
        {hostMayAnswerCounter(offer) && (
          <Stack direction="row" spacing={1}>
            <DuncitButton variant="contained" onClick={doAccept} disabled={busy} data-testid="venue-offer-accept">
              {t('mweb.venueOffer.accept')}
            </DuncitButton>
            <DuncitButton color="error" onClick={() => setRejecting(true)} disabled={busy} data-testid="venue-offer-reject">
              {t('mweb.venueOffer.reject')}
            </DuncitButton>
          </Stack>
        )}
        {actionError && <Alert severity="error">{parseApiError(actionError, t('mweb.venueOffer.answerFailed'))}</Alert>}
      </Stack>
      <ReasonDialog
        open={rejecting}
        title={t('mweb.venueOffer.rejectTitle')}
        message={t('mweb.venueOffer.rejectMessage')}
        confirmLabel={t('mweb.venueOffer.reject')}
        required={false}
        saving={declining.loading}
        onSubmit={doReject}
        onClose={() => setRejecting(false)}
      />
    </Card>
  );
}
