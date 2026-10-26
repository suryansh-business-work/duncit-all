import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { venueOfferCounterDefaults, venueOfferEditDefaults } from '@duncit/forms/schemas';
import { currentOfferTerms, offerCounterAllowance } from '@duncit/utils';
import { counterCopy, editCopy } from './answer-copy';
import { CounterOfferForm, counterTermsOf, type CounterOfferValues } from './counter-offer';
import { COUNTER_AS_HOST } from './host/queries';
import { roundVariables, type OfferTarget } from './offer-target';
import { COUNTER_VENUE_OFFER, EDIT_VENUE_OFFER_COUNTER, type OfferTerms } from './queries';
import { editCounterQuoteSource, hostCounterQuoteSource, venueCounterQuoteSource } from './useCounterQuote';
import { useOfferMutation } from './useOfferMutation';

interface Props {
  open: boolean;
  offer: OfferTerms;
  /** The venue countering its booking, the host countering back on their pod, or either side editing its own counter (by pod). */
  target: OfferTarget;
  /** `edit`: change one's own latest counter before the other side saw it, starting from it whole (note and photos too). */
  mode?: 'counter' | 'edit';
  onClose: () => void;
  onDone: () => unknown;
}

const isEdit = (mode: Props['mode']) => mode === 'edit';

/** The mutation a submit runs, and the server query its live price comes from. */
function plumbing(target: OfferTarget, edit: boolean) {
  if ('slot_id' in target) return { document: COUNTER_VENUE_OFFER, quote: venueCounterQuoteSource(target.slot_id) };
  if (edit) return { document: EDIT_VENUE_OFFER_COUNTER, quote: editCounterQuoteSource(target.pod_id) };
  return { document: COUNTER_AS_HOST, quote: hostCounterQuoteSource(target.pod_id) };
}

/** Where the form starts: the terms on the table for a counter; one's own counter, whole, for an edit. */
function startingValues(offer: OfferTerms, edit: boolean): CounterOfferValues {
  if (!edit) return venueOfferCounterDefaults(currentOfferTerms(offer));
  const own = offer.counter ?? offer;
  return venueOfferEditDefaults({
    model: own.model,
    rate: own.rate,
    minGuests: own.min_guests,
    offerings: own.offerings,
    note: own.note,
    images: own.images ?? [],
  });
}

/**
 * One side's own terms for a booking, sent for the round it read; the other
 * side then accepts, rejects or counters. A new counter starts from the terms on
 * the table and says how many counters the side has left; an edit starts from
 * the side's own counter and replaces it.
 */
export default function CounterOfferDialog({ open, offer, target, mode = 'counter', onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const edit = isEdit(mode);
  const { document, quote } = plumbing(target, edit);
  const mutation = useOfferMutation(document, target, onClose, onDone);
  const copy = edit ? editCopy(t) : counterCopy(t, target.side);
  const allowance = edit ? null : offerCounterAllowance(offer, target.side);
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
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: allowance ? 0.5 : 2 }}>
          {copy.hint}
        </Typography>
        {allowance && (
          <Typography variant="caption" component="p" sx={{ color: 'text.secondary', fontWeight: 700, mb: 2 }} data-testid="counter-offer-allowance">
            {t('availability.offers.countersLeft', { vars: { left: allowance.left, of: allowance.of } })}
          </Typography>
        )}
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
            defaultValues={startingValues(offer, edit)}
            onSubmit={submit}
          />
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton color="inherit" onClick={close} disabled={mutation.busy}>
          {t('availability.offers.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" form={formId} variant="contained" loading={mutation.busy} data-testid="counter-offer-submit">
          {edit ? t('availability.offers.revise.save') : t('availability.offers.send')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
