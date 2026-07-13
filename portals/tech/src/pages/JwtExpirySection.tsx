import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

const APP_SETTINGS = gql`
  query AppSettingsExpiry {
    appSettings {
      jwt_expires_in
      jwt_no_expiry
      updated_at
    }
  }
`;

const UPDATE = gql`
  mutation UpdateAppSettingsExpiry($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      jwt_expires_in
      jwt_no_expiry
      updated_at
    }
  }
`;

type Unit = 'm' | 'h' | 'd';
const UNIT_LABELS: Record<Unit, string> = { m: 'Minutes', h: 'Hours', d: 'Days' };

function parseExpiry(input?: string | null): { value: number; unit: Unit } {
  if (!input) return { value: 7, unit: 'd' };
  const m = /^(\d+)\s*([mhd])$/i.exec(input.trim());
  if (m) return { value: Number(m[1]), unit: m[2].toLowerCase() as Unit };
  const n = Number(input);
  if (!Number.isNaN(n)) return { value: Math.max(1, Math.round(n / 86400)), unit: 'd' };
  return { value: 7, unit: 'd' };
}

interface Props {
  onToast: (msg: string) => void;
}

export default function JwtExpirySection({ onToast }: Readonly<Props>) {
  const { data, loading, error, refetch } = useQuery(APP_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE);

  const [value, setValue] = useState(7);
  const [unit, setUnit] = useState<Unit>('d');
  const [noExpire, setNoExpire] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.appSettings) {
      const p = parseExpiry(data.appSettings.jwt_expires_in);
      setValue(p.value);
      setUnit(p.unit);
      setNoExpire(!!data.appSettings.jwt_no_expiry);
    }
  }, [data]);

  const dirty = useMemo(() => {
    if (!data?.appSettings) return false;
    const p = parseExpiry(data.appSettings.jwt_expires_in);
    return (
      noExpire !== !!data.appSettings.jwt_no_expiry || value !== p.value || unit !== p.unit
    );
  }, [data, value, unit, noExpire]);

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await save({
        variables: {
          input: {
            jwt_no_expiry: noExpire,
            jwt_expires_in: noExpire ? null : `${value}${unit}`,
          },
        },
      });
      onToast('JWT settings saved');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  let body: ReactNode;
  if (loading && !data) {
    body = (
      <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else {
    body = (
      <Stack spacing={2}>
        <FormControlLabel
          control={<Switch checked={noExpire} onChange={(_, v) => setNoExpire(v)} color="warning" />}
          label={
            <Box>
              <Typography variant="body2" fontWeight={600}>Tokens never expire</Typography>
              <Typography variant="caption" color="text.secondary">Not recommended for production.</Typography>
            </Box>
          }
        />
        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Duration"
            type="number"
            value={value}
            onChange={(e) => setValue(Math.max(1, Number(e.target.value) || 1))}
            inputProps={{ min: 1 }}
            disabled={noExpire}
            sx={{ maxWidth: 160 }}
          />
          <TextField
            label="Unit"
            select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            disabled={noExpire}
            sx={{ maxWidth: 200 }}
          >
            {(['m', 'h', 'd'] as Unit[]).map((u) => (
              <MenuItem key={u} value={u}>{UNIT_LABELS[u]}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ alignSelf: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {noExpire
                ? 'Tokens issued from now will not expire.'
                : `Tokens will expire after ${value}${unit} (${value} ${UNIT_LABELS[unit].toLowerCase()}).`}
            </Typography>
          </Box>
        </Stack>
        {opError && <Alert severity="error">{opError}</Alert>}
        {data?.appSettings?.updated_at && (
          <Typography variant="caption" color="text.secondary">
            Last updated {new Date(data.appSettings.updated_at).toLocaleString()}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1">Authentication · JWT Token Expiry</Typography>
            <Typography variant="body2" color="text.secondary">
              Controls how long access tokens issued at login remain valid.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={submit} disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </Stack>

        {body}
      </CardContent>
    </Card>
  );
}
