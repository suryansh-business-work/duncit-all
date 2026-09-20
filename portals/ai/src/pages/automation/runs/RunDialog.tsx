import { Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { RUN_MODE_KEYS, RUN_STATUS_KEYS } from '../node-kinds';
import type { AutomationRun } from '../types';
import ChatTranscript from '../test-chat/ChatTranscript';
import StepTrace from '../test-chat/StepTrace';

interface Props {
  run: AutomationRun | null;
  cancelling: boolean;
  onCancel: (run: AutomationRun) => void;
  onClose: () => void;
}

const OPEN_STATUSES = new Set(['RUNNING', 'WAITING_REPLY', 'WAITING_DELAY']);

/** One run in full — the same transcript and trace the test window shows, read back later. */
export default function RunDialog({ run, cancelling, onCancel, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const contact = run ? run.contact.phone || run.contact.email : '';
  return (
    <Dialog open={!!run} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="automation-run-dialog-title">
      <DialogTitle id="automation-run-dialog-title">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography component="span" variant="h6">
            {run?.contact.name}
          </Typography>
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            {contact}
          </Typography>
          {run && <Chip size="small" label={t(RUN_MODE_KEYS[run.mode])} variant="outlined" />}
          {run && <Chip size="small" label={t(RUN_STATUS_KEYS[run.status])} />}
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {run && (
          <Box>
            <ChatTranscript run={run} />
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              <StepTrace steps={run.steps} defaultExpanded />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {run && OPEN_STATUSES.has(run.status) && (
          <DuncitButton color="error" disabled={cancelling} onClick={() => onCancel(run)} data-testid="automation-run-cancel">
            {t('ai.automation.runs.cancel')}
          </DuncitButton>
        )}
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
