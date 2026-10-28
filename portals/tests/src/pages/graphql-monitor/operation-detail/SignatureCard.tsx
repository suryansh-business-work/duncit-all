import { Box, Chip, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { copyToClipboard } from '@duncit/utils';
import { SectionCard } from '@duncit/ui';
import type { OperationDetail } from '../queries';

interface Props {
  operation: OperationDetail;
}

/** The document as the server keys it, and every schema field it reaches. */
export default function SignatureCard({ operation }: Readonly<Props>) {
  const { t } = useTranslation();

  const copy = async () => {
    if (await copyToClipboard(operation.signature)) notifySuccess(t('tech.graphqlMonitor.signatureCopied'));
    else notifyError(t('tech.graphqlMonitor.signatureCopyFailed'));
  };

  return (
    <SectionCard
      title={t('tech.graphqlMonitor.signatureTitle')}
      subtitle={t('tech.graphqlMonitor.signatureSubtitle')}
      action={
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={copy}
          disabled={!operation.signature}
          data-testid="graphql-monitor-signature-copy"
        >
          {t('tech.graphqlMonitor.signatureCopy')}
        </DuncitButton>
      }
    >
      <Box
        component="pre"
        data-testid="graphql-monitor-signature"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight: 260,
          overflow: 'auto',
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontFamily: 'monospace',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {operation.signature || '—'}
      </Box>
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        {t('tech.graphqlMonitor.fieldsUsed', { vars: { total: operation.fields.length } })}
      </Typography>
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap' }} data-testid="graphql-monitor-fields-used">
        {operation.fields.map((coordinate) => (
          <Chip key={coordinate} size="small" variant="outlined" label={coordinate} sx={{ fontFamily: 'monospace' }} />
        ))}
      </Stack>
    </SectionCard>
  );
}
