import { Alert, Stack, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { WaConnection } from '../whatsappQueries';
import QrSection from './QrSection';
import type { useWaConnect } from './useWaConnect';

interface Props {
  connection: WaConnection;
  wa: ReturnType<typeof useWaConnect>;
  onBack: () => void;
}

/**
 * Step 2: Connect starts the session on the gateway and shows its QR to scan. Once the
 * phone links, the page flips to the connected summary and the lead tools open. A session
 * that is booting or failed offers Restart instead of Connect.
 */
export default function LinkStep({ connection, wa, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const active = wa.connecting || wa.starting;
  const stalled = wa.connecting || connection.status === 'ERROR';
  // The gateway holds a failure's reason in memory only, so after it restarts a failed session has none.
  const failedNoReason = connection.status === 'ERROR' ? t('crm.tools.sessionFailedNoReason') : null;
  const error = wa.actionError || connection.last_error || failedNoReason;

  return (
    <Stack spacing={2}>
      {!active && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.tools.linkIntro')}
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <QrSection
        connecting={active}
        qr={wa.qr}
        waitingText={wa.linkedBefore ? t('crm.tools.resumingSession') : t('crm.tools.waitingForQr')}
      />
      {wa.connecting && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          {t('crm.tools.helpStepStuck')}
        </Typography>
      )}
      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
        <DuncitButton startIcon={<ArrowBackIcon />} disabled={wa.busy} onClick={onBack}>
          {t('crm.tools.backToGateway')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          startIcon={stalled ? <RestartAltIcon /> : <WhatsAppIcon />}
          disabled={wa.busy}
          onClick={() => wa.start(stalled)}
        >
          {stalled ? t('crm.tools.restartConnection') : t('crm.tools.connect')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
