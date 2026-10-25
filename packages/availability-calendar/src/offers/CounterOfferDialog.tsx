import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { venueOfferCounterDefaults } from '@duncit/forms/schemas';
import { currentOfferTerms } from '@duncit/utils';
import { counterCopy } from './answer-copy';
import { CounterOfferForm, counterTermsOf, type CounterOfferValues } from './counter-offer';
import { COUNTER_AS_HOST } from './host/queries';
import { roundVariables, type OfferTarget } from './offer-target';
import { COUNTER_VENUE_OFFER, type OfferTerms } from './queries';
import { hostCounterQuoteSource, venueCounterQuoteSource } from './useCounterQuote';
import { useOfferMutation } from './useOfferMutation';

interface Props {
  open: boolean;
  offer: OfferTerms;
  /** The venue countering its booking, or the host countering back on their pod. */
  target: OfferTarget;
  onClose: () => void;
  onDone: () => unknown;
}

/**
 * One side's own terms for a booking, starting from the terms on the table and
 * sent for the round it read; the other side then accepts, rejects or counters.
 */
export default function CounterOfferDialog({ open, offer, target, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const mutation = useOfferMutation(target.side === 'HOST' ? COUNTER_AS_HOST : COUNTER_VENUE_OFFER, target, onClose, onDone);
  const quote = target.side === 'HOST' ? hostCounterQuoteSource(target.pod_id) : venueCounterQuoteSource(target.slot_id);
  const copy = counterCopy(t, target.side);
  const formId = `counter-offer-${offer.slot_id}`;
  const close = () => {
    mutation.clearError();
    onClose();
  };
  const submit = async (values: CounterOfferValues) => {
    await mutation.run({ terms: counterTermsOf(values), note: values.note.trim() || null, ...roundVariables(offer.round) }, copy.done);
  };

  return (
    <Dialog open={open} onClose={mutation.busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={`${formId}-title`}>
      <DialogTitle id={`${formId}-title`}>{copy.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {copy.hint}
        </Typography>
        {mutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {mutation.error}
          </Alert>
        )}
        {open && (
          <CounterOfferForm
            formId={formId}
            side={target.side}
            quote={quote}
            maxGuests={offer.pax}
            defaultValues={venueOfferCounterDefaults(currentOfferTerms(offer))}
            onSubmit={submit}
          />
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton color="inherit" onClick={close} disabled={mutation.busy}>
          {t('availability.offers.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" form={formId} variant="contained" loading={mutation.busy} data-testid="counter-offer-submit">
          {t('availability.offers.send')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
