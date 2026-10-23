import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { venueOfferCounterDefaults } from '@duncit/forms/schemas';
import { currentOfferTerms } from '@duncit/utils';
import { CounterOfferForm, counterTermsOf, type CounterOfferValues } from './counter-offer';
import { COUNTER_VENUE_OFFER, type BookingOffer } from './queries';
import { useOfferMutation } from './useOfferMutation';

interface Props {
  open: boolean;
  offer: BookingOffer;
  onClose: () => void;
  onDone: () => unknown;
}

/** The venue's own terms for a booking, starting from the terms on the table; the host then accepts or declines them. */
export default function CounterOfferDialog({ open, offer, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const mutation = useOfferMutation(COUNTER_VENUE_OFFER, offer.slot_id, onClose, onDone);
  const formId = `counter-offer-${offer.slot_id}`;
  const close = () => {
    mutation.clearError();
    onClose();
  };
  const submit = async (values: CounterOfferValues) => {
    await mutation.run({ terms: counterTermsOf(values), note: values.note.trim() || null }, t('availability.offers.done.countered'));
  };

  return (
    <Dialog open={open} onClose={mutation.busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={`${formId}-title`}>
      <DialogTitle id={`${formId}-title`}>{t('availability.offers.counterTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('availability.offers.counterHint')}
        </Typography>
        {mutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {mutation.error}
          </Alert>
        )}
        {open && (
          <CounterOfferForm
            formId={formId}
            slotId={offer.slot_id}
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
