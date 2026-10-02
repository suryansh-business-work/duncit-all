import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  connecting: boolean;
  qr: string | undefined;
}

/** The QR to scan while CONNECTING, or a spinner until the gateway hands one over. */
export default function QrSection({ connecting, qr }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      {connecting && qr ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 1
            }}>
            Open WhatsApp → Linked devices → Link a device, then scan:
          </Typography>
          <Box component="img" src={qr} alt={t('crm.tools.whatsappQr')} sx={{ width: 240, height: 240 }} />
        </Box>
      ) : null}
      {connecting && !qr ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "center"
          }}>
          <CircularProgress size={20} />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>{t('crm.tools.waitingForQr')}</Typography>
        </Stack>
      ) : null}
    </>
  );
}
