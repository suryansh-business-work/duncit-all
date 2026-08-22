import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  pdfUrl: string;
  loading: boolean;
}

/**
 * What is about to be signed, rendered by the browser's own PDF viewer.
 *
 * The preview comes FIRST in the stepper deliberately: a signature is worth
 * nothing if the signer could not read what they were signing. Zooming and
 * paging are the viewer's own — no second PDF engine shipped to do what the
 * browser already does well.
 */
export default function PreviewStep({ pdfUrl, loading }: Readonly<Props>) {
  const { t } = useTranslation();

  if (loading && !pdfUrl) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box
        component="object"
        data={pdfUrl}
        type="application/pdf"
        sx={{ width: '100%', height: 460, border: 1, borderColor: 'divider', borderRadius: 1 }}
      >
        <Typography variant="body2" sx={{ p: 2 }}>
          {t('legal.sign.noInlinePdf')}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {t('legal.sign.viewerHint')}
      </Typography>
    </Stack>
  );
}
