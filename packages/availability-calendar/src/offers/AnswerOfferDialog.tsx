import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { makeVenueOfferRejectSchema, venueOfferRejectDefaults, type VenueOfferRejectValues } from '@duncit/forms/schemas';
import { rupees } from '../pricing/format';
import { ACCEPT_VENUE_OFFER, REJECT_VENUE_OFFER, type OfferRequestSummary } from './queries';
import { useOfferMutation } from './useOfferMutation';

export type AnswerChoice = 'accept' | 'reject';

interface Props {
  request: OfferRequestSummary;
  choice: AnswerChoice | null;
  /** What the venue receives if it accepts. */
  payout: number;
  onClose: () => void;
  onDone: () => unknown;
}

/** Accept (one confirmation naming exactly what goes live) or reject (an optional reason for the host) a booking request. */
export default function AnswerOfferDialog({ request, choice, payout, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const accept = choice === 'accept';
  const schema = useMemo(() => makeVenueOfferRejectSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<VenueOfferRejectValues>({ resolver: zodResolver(schema), defaultValues: venueOfferRejectDefaults });
  // Every way out — cancel, or the answer going through — starts the next answer blank.
  const finish = () => {
    reset(venueOfferRejectDefaults);
    onClose();
  };
  const mutation = useOfferMutation(accept ? ACCEPT_VENUE_OFFER : REJECT_VENUE_OFFER, request.slot_id, finish, onDone);
  const formId = `answer-offer-${request.slot_id}`;
  const vars = {
    pod: request.pod_title,
    venue: request.venue_name,
    when: `${fmt.formatDateTime(request.start_at)} – ${fmt.formatTime(request.end_at)}`,
    amount: rupees(payout),
  };
  const close = () => {
    mutation.clearError();
    finish();
  };
  const submit = handleSubmit(async ({ reason }) => {
    if (accept) await mutation.run({}, t('availability.offers.done.accepted'));
    else await mutation.run({ reason: reason || null }, t('availability.offers.done.rejected'));
  });

  return (
    <Dialog open={!!choice} onClose={mutation.busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={`${formId}-title`}>
      <DialogTitle id={`${formId}-title`}>
        {accept ? t('availability.offers.acceptTitle') : t('availability.offers.rejectTitle')}
      </DialogTitle>
      <DialogContent>
        {mutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {mutation.error}
          </Alert>
        )}
        <form id={formId} noValidate onSubmit={submit}>
          {accept ? (
            <Typography variant="body2">
              {request.pod_is_free
                ? t('availability.offers.acceptMessageFree', { vars })
                : t('availability.offers.acceptMessage', { vars })}
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('availability.offers.rejectMessage')}
              </Typography>
              <RhfTextField control={control} name="reason" multiline minRows={2} label={t('availability.offers.reason')} />
            </>
          )}
        </form>
      </DialogContent>
      <DialogActions>
        <DuncitButton color="inherit" onClick={close} disabled={mutation.busy}>
          {t('availability.offers.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form={formId}
          variant="contained"
          color={accept ? 'primary' : 'error'}
          loading={mutation.busy}
          data-testid="answer-offer-submit"
        >
          {accept ? t('availability.offers.accept') : t('availability.offers.reject')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
