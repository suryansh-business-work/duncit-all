import { Alert, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { WaConnection } from '../whatsappQueries';
import ConnectedSummary from './ConnectedSummary';
import QrSection from './QrSection';
import ApiKeyRow from './ApiKeyRow';
import AdvancedSettings from './AdvancedSettings';
import { useWaConnect } from './useWaConnect';

const STATUS_COLOR: Record<WaConnection['status'], 'success' | 'warning' | 'error' | 'default'> = {
  CONNECTED: 'success',
  CONNECTING: 'warning',
  ERROR: 'error',
  DISCONNECTED: 'default',
};

const STATUS_LABEL_KEY: Record<WaConnection['status'], string> = {
  CONNECTED: 'crm.tools.statusConnected',
  CONNECTING: 'crm.tools.statusConnecting',
  ERROR: 'crm.tools.statusError',
  DISCONNECTED: 'crm.tools.statusDisconnected',
};

interface Props {
  connection: WaConnection;
  onChanged: () => void;
}

/**
 * Connect panel. Opening the page starts the WhatsApp session by itself and
 * shows its QR here; the gateway API key is generated server-side with one
 * click (or automatically on connect). Manual URL/key entry stays available
 * under Advanced settings. On CONNECT it flips to the connected summary.
 */
export default function WhatsAppConnectCard({ connection, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const wa = useWaConnect(connection, onChanged);

  if (connection.status === 'CONNECTED') {
    return <ConnectedSummary connection={connection} busy={wa.busy} onDisconnect={wa.stop} />;
  }

  const stalled = wa.connecting || connection.status === 'ERROR';
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography component="h2" sx={{ fontWeight: 800 }}>
              {t('crm.tools.gatewayConnection')}
            </Typography>
            <Chip size="small" label={t(STATUS_LABEL_KEY[connection.status])} color={STATUS_COLOR[connection.status]} />
          </Stack>
          {wa.actionError && <Alert severity="error">{wa.actionError}</Alert>}
          {!wa.actionError && connection.last_error && <Alert severity="error">{connection.last_error}</Alert>}
          <ApiKeyRow
            hasKey={connection.has_api_key}
            busy={wa.busy}
            generated={wa.generated}
            error={wa.generateError}
            onGenerate={wa.generateKey}
          />
          <QrSection connecting={wa.connecting} qr={wa.qr} />
          <DuncitButton
            variant="contained"
            startIcon={stalled ? <RestartAltIcon /> : <WhatsAppIcon />}
            disabled={wa.busy}
            onClick={() => wa.start(stalled)}
          >
            {stalled ? t('crm.tools.restartConnection') : t('crm.tools.connect')}
          </DuncitButton>
          <AdvancedSettings
            baseUrl={connection.base_url}
            hasKey={connection.has_api_key}
            busy={wa.busy}
            onSave={wa.saveAndConnect}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
