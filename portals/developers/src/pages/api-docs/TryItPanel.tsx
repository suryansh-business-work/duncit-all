import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { API_BASE, buildPath, type ApiEndpoint } from './apiReference';

interface Props {
  endpoint: ApiEndpoint;
  apiKey: string;
}

/** Live Try-It console for one endpoint: fill params, run the real request. */
export default function TryItPanel({ endpoint, apiKey }: Readonly<Props>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResponse('');
    setStatus(null);
    try {
      const bodyParams = endpoint.params.filter((p) => p.where === 'body' && values[p.name]?.trim());
      const res = await fetch(`${API_BASE}${buildPath(endpoint, values)}`, {
        method: endpoint.method,
        headers: {
          'x-api-key': apiKey,
          ...(bodyParams.length > 0 ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(bodyParams.length > 0
          ? { body: JSON.stringify(Object.fromEntries(bodyParams.map((p) => [p.name, values[p.name].trim()]))) }
          : {}),
      });
      setStatus(res.status);
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const missingRequired = endpoint.params.some((p) => p.required && !values[p.name]?.trim());

  return (
    <Stack spacing={1.25}>
      {endpoint.params.map((param) => (
        <TextField
          key={param.name}
          size="small"
          label={`${param.name}${param.required ? ' *' : ''} (${param.where})`}
          helperText={param.description}
          value={values[param.name] ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
          fullWidth
        />
      ))}
      <Button
        variant="contained"
        startIcon={<PlayArrowIcon />}
        onClick={run}
        disabled={busy || !apiKey.trim() || missingRequired}
        sx={{ alignSelf: 'flex-start' }}
      >
        {busy ? 'Running…' : 'Send request'}
      </Button>
      {!apiKey.trim() && (
        <Typography variant="caption" color="text.secondary">
          Paste an API key above to send live requests.
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {status !== null && (
        <Box>
          <Typography variant="caption" fontWeight={900} color={status < 400 ? 'success.main' : 'error.main'}>
            HTTP {status}
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              mt: 0.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              fontSize: 12,
              overflowX: 'auto',
              maxHeight: 320,
            }}
          >
            {response}
          </Box>
        </Box>
      )}
    </Stack>
  );
}
