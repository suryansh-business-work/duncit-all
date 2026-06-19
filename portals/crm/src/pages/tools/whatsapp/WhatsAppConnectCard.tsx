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
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {
  WA_CONNECT,
  WA_DISCONNECT,
  WA_GENERATE_API_KEY,
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
  const [generate, generateState] = useMutation(WA_GENERATE_API_KEY);

  // Poll the live status + QR only while a scan is pending.
  const statusQuery = useQuery(WA_STATUS, { pollInterval: connecting ? 3000 : 0, skip: !connecting });
  const qrQuery = useQuery(WA_QR, { pollInterval: connecting ? 3000 : 0, skip: !connecting });
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
          {actionError && <Alert severity="error">{actionError}</Alert>}
          {!actionError && connection.last_error && <Alert severity="error">{connection.last_error}</Alert>}
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
          <Box>
            <Button
              size="small"
              startIcon={<VpnKeyIcon fontSize="small" />}
              disabled={busy || !baseUrl.trim() || !apiKey.trim()}
              onClick={handleGenerate}
            >
              Generate API key
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Paste your master/admin key above, then generate a dedicated key (saved automatically).
            </Typography>
            {generateState.error && (
              <Typography variant="caption" color="error" display="block">
                {generateState.error.message}
              </Typography>
            )}
          </Box>
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
