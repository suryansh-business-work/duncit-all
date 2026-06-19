import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  WA_CONNECT,
  WA_DISCONNECT,
  WA_QR,
  WA_SAVE_CONFIG,
  WA_STATUS,
  type WaConnection,
} from './whatsappQueries';

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
  const [baseUrl, setBaseUrl] = useState(connection.base_url || 'https://open-wa-server.duncit.com');
  const [apiKey, setApiKey] = useState('');
  const connecting = connection.status === 'CONNECTING';
  const connected = connection.status === 'CONNECTED';

  const [saveConfig, saveState] = useMutation(WA_SAVE_CONFIG);
  const [connect, connectState] = useMutation(WA_CONNECT);
  const [disconnect, disconnectState] = useMutation(WA_DISCONNECT);

  // Poll the live status + QR only while a scan is pending.
  const statusQuery = useQuery(WA_STATUS, { pollInterval: connecting ? 3000 : 0, skip: !connecting });
  const qrQuery = useQuery(WA_QR, { pollInterval: connecting ? 3000 : 0, skip: !connecting });
  const polledStatus: string | undefined = statusQuery.data?.waStatus?.status;
  useEffect(() => {
    if (polledStatus && polledStatus !== 'CONNECTING') onChanged();
  }, [polledStatus, onChanged]);

  const busy = saveState.loading || connectState.loading || disconnectState.loading;

  const handleConnect = async () => {
    await saveConfig({ variables: { input: { base_url: baseUrl, api_key: apiKey || undefined } } });
    await connect();
    onChanged();
  };

  if (connected) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WhatsAppIcon sx={{ color: '#25D366' }} />
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800}>Connected</Typography>
              <Typography variant="body2" color="text.secondary">
                {connection.phone ? `+${connection.phone}` : 'WhatsApp account linked'}
              </Typography>
            </Box>
            <Button
              color="error"
              variant="outlined"
              disabled={busy}
              onClick={() => disconnect().then(onChanged)}
            >
              Disconnect
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const qr = qrQuery.data?.waQr?.qr_code as string | undefined;
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={800}>Gateway connection</Typography>
            <Chip size="small" label={connection.status} color={STATUS_COLOR[connection.status]} />
          </Stack>
          {connection.last_error && <Alert severity="error">{connection.last_error}</Alert>}
          <TextField
            label="Gateway URL"
            size="small"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            fullWidth
          />
          <TextField
            label="API Key"
            size="small"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={connection.has_api_key ? '•••••• (saved — leave blank to keep)' : 'Paste the OpenWA API key'}
            fullWidth
          />
          {connecting && qr ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Open WhatsApp → Linked devices → Link a device, then scan:
              </Typography>
              <Box component="img" src={qr} alt="WhatsApp QR" sx={{ width: 240, height: 240 }} />
            </Box>
          ) : null}
          {connecting && !qr ? (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Waiting for QR…</Typography>
            </Stack>
          ) : null}
          <Button
            variant="contained"
            startIcon={<WhatsAppIcon />}
            disabled={busy}
            onClick={handleConnect}
          >
            {connecting ? 'Restart connection' : 'Save & Connect'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
