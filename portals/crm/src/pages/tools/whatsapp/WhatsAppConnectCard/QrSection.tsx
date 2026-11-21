import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  connecting: boolean;
  qr: string | undefined;
}

/** The QR to scan while CONNECTING, or a spinner until the gateway hands one over. */
export default function QrSection({ connecting, qr }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!connecting) return null;
  if (qr) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {t('crm.tools.scanInstructions')}
        </Typography>
        <Box component="img" src={qr} alt={t('crm.tools.whatsappQr')} sx={{ width: 240, height: 240 }} />
      </Box>
    );
  }
  return (
    <Stack direction="row" spacing={1} role="status" sx={{ alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={20} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('crm.tools.waitingForQr')}
      </Typography>
    </Stack>
  );
}
