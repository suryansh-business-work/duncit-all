import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Typography } from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/app-settings';
import type { PolicyVersionRow } from '../../../graphql/policyAcceptance';

interface Props {
  version: PolicyVersionRow | null;
  onClose: () => void;
}

/**
 * One wording, read-only.
 *
 * Rendered through the same rich-text component that wrote it, so what an
 * auditor reads here is what the person read when they accepted — a plain
 * `dangerouslySetInnerHTML` would drop the editor's own styling and quietly
 * change the document.
 */
export default function WordingDialog({ version, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const heading = version
    ? t('legalAcceptanceLogs.detail.versionLabel', { vars: { no: String(version.version_no) } })
    : '';

  return (
    <Dialog open={!!version} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {version?.title}
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          {heading}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Paper variant="outlined" sx={{ p: 2 }}>
          {version?.content ? (
            <DuncitRichTextInput value={version.content} onChange={() => undefined} readOnly bare />
          ) : (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('legalAcceptanceLogs.detail.wordingEmpty')}
            </Typography>
          )}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
