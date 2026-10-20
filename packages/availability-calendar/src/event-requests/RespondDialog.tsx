import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { createLogger } from '@duncit/logs';
import { errorText } from '../pricing/format';
import type { Translate } from '../pricing/types';
import { RESPOND_TO_EVENT_REQUEST, type EventRequestOfferView } from './queries';
import { RespondEventRequestForm, offerInput, respondDefaults, type RespondChoice, type RespondEventRequestValues } from './respond-form';

const logger = createLogger('portal');

function titleOf(t: Translate, choice: RespondChoice): string {
  if (choice === 'ACCEPT') return t('venuePricing.respond.acceptTitle');
  if (choice === 'REJECT') return t('venuePricing.respond.rejectTitle');
  return t('venuePricing.respond.counterTitle');
}

function confirmOf(t: Translate, choice: RespondChoice): string {
  if (choice === 'ACCEPT') return t('venuePricing.respond.accept');
  if (choice === 'REJECT') return t('venuePricing.respond.reject');
  return t('venuePricing.respond.sendOffer');
}

interface Props {
  requestId: string;
  choice: RespondChoice | null;
  venueId: string | null;
  requesterName: string;
  offer: EventRequestOfferView | null;
  onClose: () => void;
  onDone: () => Promise<unknown> | void;
}

/** Accept, reject or counter one request — the note, and for a counter the window the venue's pricing prices. */
export default function RespondDialog({ requestId, choice, venueId, requesterName, offer, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [respond, state] = useMutation(RESPOND_TO_EVENT_REQUEST);
  const [error, setError] = useState<string | null>(null);
  const formId = `respond-event-request-${requestId}`;

  const submit = async (values: RespondEventRequestValues) => {
    if (!choice) return;
    setError(null);
    try {
      const counterOffer = choice === 'COUNTER' ? offerInput(values) : null;
      await respond({ variables: { id: requestId, response: choice, note: values.note.trim() || null, offer: counterOffer } });
    } catch (e) {
      setError(errorText(e, t('venuePricing.respond.failed')));
      logger.warn('RespondDialog', 'respond', { error: e, request_id: requestId, response: choice });
      return;
    }
    notifySuccess(t('venuePricing.respond.done'));
    onClose();
    // The answer is saved; a failed re-read only leaves the list a moment stale.
    try {
      await onDone();
    } catch (e) {
      logger.warn('RespondDialog', 'refresh', { error: e, request_id: requestId });
    }
  };

  return (
    <Dialog open={!!choice} onClose={state.loading ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby={`${formId}-title`}>
      {choice && (
        <>
          <DialogTitle id={`${formId}-title`}>{titleOf(t, choice)}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {t('venuePricing.respond.forRequester', { vars: { name: requesterName } })}
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <RespondEventRequestForm
              formId={formId}
              choice={choice}
              venueId={venueId}
              defaultValues={respondDefaults(offer)}
              onSubmit={submit}
            />
          </DialogContent>
          <DialogActions>
            <DuncitButton color="inherit" onClick={onClose} disabled={state.loading}>
              {t('venuePricing.respond.cancel')}
            </DuncitButton>
            <DuncitButton
              type="submit"
              form={formId}
              variant="contained"
              color={choice === 'REJECT' ? 'error' : 'primary'}
              loading={state.loading}
              data-testid="respond-submit"
            >
              {confirmOf(t, choice)}
            </DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
