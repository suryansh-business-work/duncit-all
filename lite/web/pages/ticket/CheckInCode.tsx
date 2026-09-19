import { Box, Stack, Typography } from '@mui/material';
import { useWebT } from '../../../shared/i18n';

/** The short code the host types at the door, drawn large enough to read across a table. */
export function CheckInCode({ code }: Readonly<{ code: string }>) {
  const { t } = useWebT();
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center' }} data-testid="check-in-code">
      <Typography variant="overline" color="text.secondary">
        {t('liteWeb.ticket.codeLabel')}
      </Typography>
      <Box
        component="p"
        sx={{
          m: 0,
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: { xs: '2.4rem', md: '3rem' },
          fontWeight: 800,
          letterSpacing: '0.18em',
          px: 3,
          py: 1.5,
          borderRadius: 3,
          bgcolor: 'rgba(217, 45, 45, 0.08)',
          color: 'primary.main',
        }}
        aria-label={t('liteWeb.ticket.codeAria', { vars: { code } })}
      >
        {code}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t('liteWeb.ticket.codeHint')}
      </Typography>
    </Stack>
  );
}
