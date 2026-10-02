import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { DuncitButton } from '@duncit/buttons';
import {
  WA_CONNECT,
  WA_DISCONNECT,
  WA_GENERATE_API_KEY,
  WA_QR,
  WA_SAVE_CONFIG,
  WA_STATUS,
  type WaConnection,
} from '../whatsappQueries';
import { useTranslation } from '@duncit/shell';
import ConnectedSummary from './ConnectedSummary';
import QrSection from './QrSection';

const STATUS_COLOR: Record<WaConnection['status'], 'success' | 'warning' | 'error' | 'default'> = {
  CONNECTED: 'success',
  CONNECTING: 'warning',
  ERROR: 'error',
  DISCONNECTED: 'default',
};

interface Props {
  connection: WaConnection;
  onChanged: () => void;
}

/** Connect panel: configure the gateway URL + API key, start a session and scan
 * the QR. While CONNECTING it polls status + QR; on CONNECT it flips to a
 * connected summary. (bug WA-LeadGen P3) */
export default function WhatsAppConnectCard({ connection, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState(connection.base_url || 'https://open-wa-server.duncit.com');
  const [apiKey, setApiKey] = useState('');
  const connecting = connection.status === 'CONNECTING';
  const connected = connection.status === 'CONNECTED';

  const [saveConfig, saveState] = useMutation<any>(WA_SAVE_CONFIG);
  const [connect, connectState] = useMutation<any>(WA_CONNECT);
  const [disconnect, disconnectState] = useMutation<any>(WA_DISCONNECT);
  const [generate, generateState] = useMutation<any>(WA_GENERATE_API_KEY);

  // Poll the live status + QR only while a scan is pending.
  const statusQuery = useQuery<any>(WA_STATUS, { pollInterval: connecting ? 3000 : 0, skip: !connecting });
  const qrQuery = useQuery<any>(WA_QR, { pollInterval: connecting ? 3000 : 0, skip: !connecting });
  const polledStatus: string | undefined = statusQuery.data?.waStatus?.status;
  useEffect(() => {
    if (polledStatus && polledStatus !== 'CONNECTING') onChanged();
  }, [polledStatus, onChanged]);

  const busy =
    saveState.loading || connectState.loading || disconnectState.loading || generateState.loading;

  const handleConnect = async () => {
    try {
      await saveConfig({ variables: { input: { base_url: baseUrl, api_key: apiKey || undefined } } });
      await connect();
    } catch {
      // Surfaced via connectState/saveState.error below.
    }
    onChanged();
  };

  // Mint a dedicated key from the master/admin key currently in the field.
  const handleGenerate = async () => {
    try {
      const res = await generate({ variables: { base_url: baseUrl, master_key: apiKey } });
      const key = res.data?.waGenerateApiKey?.api_key;
      if (key) setApiKey(key);
    } catch {
      // Surfaced via generateState.error below.
    }
    onChanged();
  };

  const actionError = connectState.error?.message || saveState.error?.message;

  if (connected) {
    return (
      <ConnectedSummary connection={connection} busy={busy} onDisconnect={() => disconnect().then(onChanged)} />
    );
  }

  const qr = qrQuery.data?.waQr?.qr_code as string | undefined;
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <Typography sx={{
              fontWeight: 800
            }}>{t('crm.tools.gatewayConnection')}</Typography>
            <Chip size="small" label={connection.status} color={STATUS_COLOR[connection.status]} />
          </Stack>
          {actionError && <Alert severity="error">{actionError}</Alert>}
          {!actionError && connection.last_error && <Alert severity="error">{connection.last_error}</Alert>}
          <TextField
            label={t('crm.tools.gatewayUrl')}
            size="small"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('crm.tools.apiKey2')}
            size="small"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={connection.has_api_key ? '•••••• (saved — leave blank to keep)' : 'Paste the OpenWA API key'}
            fullWidth
          />
          <Box>
            <DuncitButton
              size="small"
              startIcon={<VpnKeyIcon fontSize="small" />}
              disabled={busy || !baseUrl.trim() || !apiKey.trim()}
              onClick={handleGenerate}
            >
              Generate API key
            </DuncitButton>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block"
              }}>
              Paste your master/admin key above, then generate a dedicated key (saved automatically).
            </Typography>
            {generateState.error && (
              <Typography variant="caption" color="error" role="alert" sx={{
                display: "block"
              }}>
                {generateState.error.message}
              </Typography>
            )}
          </Box>
          <QrSection connecting={connecting} qr={qr} />
          <DuncitButton
            variant="contained"
            startIcon={<WhatsAppIcon />}
            disabled={busy}
            onClick={handleConnect}
          >
            {connecting ? 'Restart connection' : 'Save & Connect'}
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
