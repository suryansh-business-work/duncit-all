import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '../../i18n/useTranslation';
import { notifyError, notifySuccess } from '../../components/notify';
import { POD_CHALLENGE_CHECKPOINT_LINKS } from './toolQueries';

interface Props {
  challengeId: string;
  /** The Checkpoint tool whose codes to show; null keeps the dialog closed. */
  toolInstanceId: string | null;
  onClose: () => void;
}

/**
 * The QR code to post at each checkpoint. A competitor scans it with their
 * phone camera, which opens the arena and checks them in. The codes are
 * fetched only when a host opens this dialog — they never ride along with the
 * challenge everyone else receives.
 */
export default function CheckpointLinksDialog({ challengeId, toolInstanceId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(POD_CHALLENGE_CHECKPOINT_LINKS, {
    variables: { id: challengeId, toolInstanceId: toolInstanceId ?? '' },
    skip: !toolInstanceId,
  });
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess(t('mweb.challenge.linkCopied'));
    } catch (copyError) {
      logs.mWeb.warn('host-pod-challenges', 'checkpoint-link', { error: copyError });
      notifyError(t('mweb.challenge.linkCopyFailed'));
    }
  };

  return (
    <Dialog open={!!toolInstanceId} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="checkpoint-links-title">
      <DialogTitle id="checkpoint-links-title">{t('mweb.challenge.tools.checkpointQr')}</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 2 }}>{t('mweb.challenge.tools.checkpointQrHint')}</DialogContentText>
        {loading && <CircularProgress aria-label={t('mweb.challenge.loading')} />}
        {error && <Alert severity="error">{error.message}</Alert>}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          {(data?.podChallengeCheckpointLinks ?? []).map((link) => (
            <Stack key={link.item_key} spacing={1} sx={{ alignItems: 'center' }}>
              <Box
                component="img"
                src={link.qr_data_url}
                alt={t('mweb.challenge.tools.qrAlt', { vars: { label: link.label } })}
                sx={{ width: '100%', maxWidth: 220, aspectRatio: '1' }}
              />
              <Typography variant="subtitle2" component="h3" sx={{ textAlign: 'center' }}>
                {link.label}
              </Typography>
              <DuncitButton size="small" startIcon={<ContentCopyIcon />} onClick={() => fireAndForget(copy(link.url), logs.mWeb, 'host-pod-challenges', 'checkpoint-link')}>
                {t('mweb.challenge.tools.copyLink')}
              </DuncitButton>
            </Stack>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('mweb.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
