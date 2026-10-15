import { useMutation } from '@apollo/client/react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { notifySuccess } from '../notify';
import { useTranslation } from '../../i18n/useTranslation';
import { RequestEventForm, type EventRequestValues } from './request-event-form';
import { MY_EVENT_REQUEST_STATE, REQUEST_EVENT, type EventRequestTarget, type MyEventRequestState } from './queries';

const FORM_ID = 'request-event-form';

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: EventRequestTarget;
  targetId: string;
  targetName: string;
}

/**
 * Ask a host or venue for an event, with an optional note. The answer replaces
 * the empty state's own read, so it flips to "already requested" at once.
 * Native twin: components/event-request/RequestEventSheet.
 */
export default function RequestEventDialog({ open, onClose, targetType, targetId, targetName }: Readonly<Props>) {
  const { t } = useTranslation();
  const variables = { target_type: targetType, target_id: targetId };
  const [request, state] = useMutation<{ requestEvent: MyEventRequestState }>(REQUEST_EVENT, {
    update: (cache, { data }) => {
      if (!data) return;
      cache.writeQuery({ query: MY_EVENT_REQUEST_STATE, variables, data: { myEventRequestState: data.requestEvent } });
    },
  });

  const submit = async (values: EventRequestValues) => {
    try {
      await request({ variables: { input: { ...variables, note: values.note } } });
    } catch (error) {
      logs.mWeb.error('RequestEventDialog', 'request', { error, target_type: targetType, target_id: targetId });
      throw error;
    }
    notifySuccess(t('publicPage.eventRequest.sent'));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="request-event-title" data-testid="request-event-dialog">
      <DialogTitle id="request-event-title" sx={{ fontWeight: 600 }}>
        {t('publicPage.eventRequest.dialogTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {targetType === 'VENUE'
              ? t('publicPage.eventRequest.dialogVenueBody', { vars: { name: targetName } })
              : t('publicPage.eventRequest.dialogHostBody', { vars: { name: targetName } })}
          </Typography>
          {open && <RequestEventForm formId={FORM_ID} onSubmit={submit} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={state.loading}>
          {t('publicPage.eventRequest.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" form={FORM_ID} variant="contained" disabled={state.loading} data-testid="request-event-send">
          {state.loading ? t('publicPage.eventRequest.sending') : t('publicPage.eventRequest.send')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
