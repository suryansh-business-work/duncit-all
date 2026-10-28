import { Box, Stack, Typography } from '@mui/material';
import { useWebT } from '../../../shared/i18n';
import { tint } from '../../../shared/theme';
import { LITE_RADII, LITE_SCHEMES } from '../../../shared/tokens';

interface CheckInCodeProps {
  code: string;
  /** The ticket's QR, once confirmed; the host scans it at the door. */
  qrDataUrl?: string | null;
}

/**
 * What a guest shows at the door: the QR the host's scanner reads and, under
 * it, the short code a host can type instead. The QR always sits on white, in
 * dark mode too, so every camera can read it.
 */
export function CheckInCode({ code, qrDataUrl }: Readonly<CheckInCodeProps>) {
  const { t } = useWebT();
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }} data-testid="check-in-code">
      <Typography variant="overline" color="text.secondary">
        {t('liteWeb.ticket.codeLabel')}
      </Typography>
      {qrDataUrl ? (
        <Box sx={{ p: 1.5, bgcolor: 'common.white', borderRadius: `${LITE_RADII.card}px`, lineHeight: 0 }}>
          <img src={qrDataUrl} alt={t('liteWeb.ticket.qrAlt', { vars: { code } })} width={220} height={220} style={{ display: 'block' }} data-testid="ticket-qr" />
        </Box>
      ) : null}
      <Box
        component="p"
        sx={{
          m: 0,
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: { xs: '2rem', md: '2.6rem' },
          fontWeight: 800,
          letterSpacing: '0.18em',
          px: 3,
          py: 1,
          borderRadius: `${LITE_RADII.card}px`,
          bgcolor: tint(LITE_SCHEMES.dark.accent, 0.12),
          color: 'secondary.main',
        }}
        aria-label={t('liteWeb.ticket.codeAria', { vars: { code } })}
      >
        {code}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {qrDataUrl ? t('liteWeb.ticket.qrHint') : t('liteWeb.ticket.codeHint')}
      </Typography>
    </Stack>
  );
}
