import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { makeVenueOfferRejectSchema, venueOfferRejectDefaults, type VenueOfferRejectValues } from '@duncit/forms/schemas';
import { answerCopy } from './answer-copy';
import { ACCEPT_VENUE_COUNTER, REJECT_VENUE_COUNTER } from './host/queries';
import { roundVariables, type OfferTarget } from './offer-target';
import { ACCEPT_VENUE_OFFER, REJECT_VENUE_OFFER } from './queries';
import { useOfferMutation } from './useOfferMutation';

export type AnswerChoice = 'accept' | 'reject';

/** What an accept names: the pod, where, when — and whether it is free (nothing quoted). */
export interface AnswerSubject {
  pod_title: string;
  venue_name: string;
  start_at: string;
  end_at: string;
  pod_is_free: boolean;
}

interface Props {
  target: OfferTarget;
  subject: AnswerSubject;
  choice: AnswerChoice | null;
  /** What the venue receives if it is accepted, as text (a range when the guests are). */
  amount: string;
  /** The round being answered; null for a request from before offers. */
  round: number | null;
  onClose: () => void;
  onDone: () => unknown;
}

const answerDocument = (target: OfferTarget, accept: boolean) => {
  if (target.side === 'HOST') return accept ? ACCEPT_VENUE_COUNTER : REJECT_VENUE_COUNTER;
  return accept ? ACCEPT_VENUE_OFFER : REJECT_VENUE_OFFER;
};

/**
 * Accept (one confirmation naming exactly what goes live) or reject (an
 * optional reason for the other side) the terms on the table — the venue
 * answering a host's offer, or the host answering the venue's counter.
 */
export default function AnswerOfferDialog({ target, subject, choice, amount, round, onClose, onDone }: Readonly<Props>) {
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
  const mutation = useOfferMutation(answerDocument(target, accept), target, finish, onDone);
  const roundId = round ?? 0;
  const formId = `answer-offer-${target.side}-${roundId}`;
  const vars = {
    pod: subject.pod_title,
    venue: subject.venue_name,
    when: `${fmt.formatDateTime(subject.start_at)} – ${fmt.formatTime(subject.end_at)}`,
    amount,
  };
  const copy = answerCopy(t, target.side, accept, vars, subject.pod_is_free);
  const close = () => {
    mutation.clearError();
    finish();
  };
  const submit = handleSubmit(async ({ reason }) => {
    const answer = accept ? {} : { reason: reason || null };
    await mutation.run({ ...answer, ...roundVariables(round) }, copy.done);
  });

  return (
    <Dialog open={!!choice} onClose={mutation.busy ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={`${formId}-title`}>
      <DialogTitle id={`${formId}-title`}>{copy.title}</DialogTitle>
      <DialogContent>
        {mutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {mutation.error}
          </Alert>
        )}
        <form id={formId} noValidate onSubmit={submit}>
          <Typography variant="body2" sx={{ mb: accept ? 0 : 2 }}>
            {copy.message}
          </Typography>
          {!accept && <RhfTextField control={control} name="reason" multiline minRows={2} label={copy.reasonLabel} />}
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
