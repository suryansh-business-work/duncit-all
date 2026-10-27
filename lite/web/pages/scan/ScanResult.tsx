import { Box, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import type { LiteRegistration } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { tint } from '../../../shared/theme';
import { LITE_RADII, LITE_SCHEMES } from '../../../shared/tokens';

export type ScanOutcome = { kind: 'ok'; registration: LiteRegistration } | { kind: 'error'; message: string };

/** The verdict on the last ticket, big enough to read at arm's length at a door. */
export function ScanResult({ outcome }: Readonly<{ outcome: ScanOutcome }>) {
  const { t } = useWebT();
  const ok = outcome.kind === 'ok';
  const color = ok ? LITE_SCHEMES.dark.success : LITE_SCHEMES.dark.error;
  return (
    <Box
      role={ok ? 'status' : 'alert'}
      sx={{ p: 2.5, borderRadius: `${LITE_RADII.card}px`, border: 2, borderColor: color, bgcolor: tint(color, 0.12), animation: 'lite-rise 240ms both' }}
      data-lite-animate
      data-testid={ok ? 'scan-ok' : 'scan-error'}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {ok ? <CheckCircleOutlineIcon sx={{ fontSize: 40, color }} aria-hidden /> : <ErrorOutlineIcon sx={{ fontSize: 40, color }} aria-hidden />}
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="h3" component="p">
            {ok ? outcome.registration.user.name : t('liteWeb.scan.refused')}
          </Typography>
          <Typography color="text.secondary">
            {ok ? t('liteWeb.scan.admitted', { vars: { ticket: outcome.registration.ticket.name, count: outcome.registration.quantity } }) : outcome.message}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
