import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { RunMessage } from '../types';

interface Props {
  message: RunMessage | null;
  onClose: () => void;
}

/**
 * The rendered email, exactly as the provider would have been handed it.
 *
 * In a sandboxed iframe with no permissions: the HTML came out of a template an
 * admin edits, and a template preview must never be able to run script against
 * the portal that shows it.
 */
export default function EmailPreviewDialog({ message, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!message} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="automation-email-preview-title">
      <DialogTitle id="automation-email-preview-title">{t('ai.automation.test.emailPreviewTitle')}</DialogTitle>
      <DialogContent>
        {message && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('ai.automation.test.emailSubject', { vars: { subject: message.subject } })}
            </Typography>
            <Box
              component="iframe"
              title={message.subject || t('ai.automation.test.emailPreviewTitle')}
              sandbox=""
              srcDoc={message.html}
              sx={{ width: '100%', height: '70vh', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
