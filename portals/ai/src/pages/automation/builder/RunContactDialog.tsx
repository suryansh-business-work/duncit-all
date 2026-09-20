import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { AutomationContactForm, type AutomationContactFormValues } from '../../../forms/automation-contact';
import { START_RUN } from '../queries';
import type { AutomationChannel, AutomationRun } from '../types';

interface Props {
  open: boolean;
  flowId: string;
  channel: AutomationChannel;
  onClose: () => void;
  onStarted: () => void;
}

/** A LIVE run for one person, by hand — the saved flow, real messages. */
export default function RunContactDialog({ open, flowId, channel, onClose, onStarted }: Readonly<Props>) {
  const { t } = useTranslation();
  const [start, { loading }] = useMutation<{ startAutomationRun: AutomationRun }>(START_RUN);

  const submit = async (values: AutomationContactFormValues) => {
    try {
      await start({
        variables: {
          flow_id: flowId,
          contact: {
            name: values.name,
            phone: channel === 'WHATSAPP' ? values.phone : null,
            email: channel === 'EMAIL' ? values.email : null,
          },
          text: values.text,
        },
      });
      notifySuccess(t('ai.automation.builder.runStarted'));
      onStarted();
      onClose();
    } catch (error) {
      notifyError(parseApiError(error, t('ai.automation.test.startFailed')));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="automation-run-contact-title">
      <DialogTitle id="automation-run-contact-title">{t('ai.automation.builder.runNowTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="warning">{t('ai.automation.builder.runNowHint')}</Alert>
          <AutomationContactForm channel={channel} submitting={loading} submitLabel={t('ai.automation.builder.runNow')} onSubmit={submit} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
