import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Button, Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import { UPDATE_USER } from './queries';

interface Props {
  userId: string;
  initialSharePct: number;
  initialCommissionPct: number;
  onSaved: (message: string) => void;
}

const clampPct = (raw: string) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
};

/** Host deduction overrides (two %s). host_share_pct = the host's slice of a
 * completed pod's net (after venue bill + GST); host_commission_pct = the
 * commission Duncit takes from that slice. 0 falls back to the global default. */
export default function CommissionSection({ userId, initialSharePct, initialCommissionPct, onSaved }: Readonly<Props>) {
  const [share, setShare] = useState(String(initialSharePct ?? 0));
  const [commission, setCommission] = useState(String(initialCommissionPct ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [updateUser, { loading }] = useMutation(UPDATE_USER);

  const save = async () => {
    const sharePct = clampPct(share);
    const commissionPct = clampPct(commission);
    if (sharePct === null || commissionPct === null) {
      setError('Enter percentages between 0 and 100');
      return;
    }
    setError(null);
    try {
      await updateUser({
        variables: { user_id: userId, input: { host_share_pct: sharePct, host_commission_pct: commissionPct } },
      });
      setShare(String(sharePct));
      setCommission(String(commissionPct));
      onSaved('Host deductions updated');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <PaidIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Host deductions
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The host's share of a completed pod's net (after venue bill + GST), and the commission Duncit takes from that
          share. Leave at 0 to use the global Default Deductions.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
          <TextField
            label="Host share"
            type="number"
            value={share}
            onChange={(e) => setShare(e.target.value)}
            inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Host share percentage' }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            sx={{ maxWidth: 200 }}
          />
          <TextField
            label="Commission from host"
            type="number"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Host commission percentage' }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            sx={{ maxWidth: 200 }}
          />
          <Button variant="contained" onClick={save} disabled={loading} sx={{ mt: 0.5 }}>
            Save
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
