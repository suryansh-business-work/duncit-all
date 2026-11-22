import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import DetailCard from './DetailCard';
import { evidenceLabels, labelOf } from '../labels';
import { useEvidenceLink, type OpenedEvidence } from './useEvidenceLink';
import type { FailedPaymentDetail } from '../queries';

const KIND_ICON: Record<string, typeof ImageIcon> = { IMAGE: ImageIcon, PDF: PictureAsPdfIcon };

function EvidencePreview({ opened, onClose }: Readonly<{ opened: OpenedEvidence; onClose: () => void }>) {
  const { t } = useTranslation();
  const image = opened.kind === 'IMAGE';
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="failed-payment-evidence-title">
      <DialogTitle id="failed-payment-evidence-title">{t('finance.failedPayments.evidencePreviewTitle')}</DialogTitle>
      <DialogContent dividers>
        {image ? (
          <Box component="img" src={opened.url} alt={t('finance.failedPayments.evidenceImageAlt')} sx={{ maxWidth: '100%', display: 'block', mx: 'auto' }} />
        ) : (
          <Typography variant="body2">{t('finance.failedPayments.evidenceOpenHint')}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        {!image && (
          <DuncitButton component="a" href={opened.url} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewIcon />} variant="contained">
            {t('finance.failedPayments.evidenceOpenFile')}
          </DuncitButton>
        )}
        <DuncitButton onClick={onClose}>{t('finance.failedPayments.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

interface Props {
  detail: FailedPaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** Every claim the buyer sent, newest last; a file opens through a fresh signed link. */
export default function EvidenceCard({ detail, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = evidenceLabels(t);
  const evidence = useEvidenceLink(detail.id);

  return (
    <DetailCard title={t('finance.failedPayments.evidenceSection')} testId="failed-payment-evidence-card">
      {evidence.error && <Alert severity="error" sx={{ mb: 1 }}>{evidence.error}</Alert>}
      {detail.claims.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('finance.failedPayments.noClaims')}</Typography>
      )}
      <Stack spacing={1.5} divider={<Divider flexItem />}>
        {detail.claims.map((claim) => (
          <Stack key={`${claim.evidence_type}-${claim.submitted_at}`} spacing={0.75}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {labelOf(labels, claim.evidence_type)} · {formatDateTime(claim.submitted_at)}
            </Typography>
            {claim.transaction_id && (
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {t('finance.failedPayments.transactionId')}: {claim.transaction_id}
              </Typography>
            )}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {claim.files.map((file, index) => {
                const Icon = KIND_ICON[file.kind] ?? InsertDriveFileIcon;
                return (
                  <DuncitButton
                    key={file.file_ref}
                    size="small"
                    variant="outlined"
                    startIcon={<Icon />}
                    loading={evidence.loadingRef === file.file_ref}
                    onClick={() => evidence.openFile(file.file_ref)}
                    data-testid="failed-payment-evidence-open"
                  >
                    {t('finance.failedPayments.evidenceFile', { vars: { n: index + 1 } })}
                  </DuncitButton>
                );
              })}
            </Stack>
          </Stack>
        ))}
      </Stack>
      {evidence.opened && <EvidencePreview opened={evidence.opened} onClose={evidence.close} />}
    </DetailCard>
  );
}
