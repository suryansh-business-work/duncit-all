import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  Slider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PercentIcon from '@mui/icons-material/Percent';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';

const FINANCE_SETTINGS = gql`
  query FinanceSettings {
    financeSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      invoice_prefix
      dummy_mode
      business_name
      business_address
      business_gstin
      updated_at
    }
  }
`;

const UPDATE = gql`
  mutation UpdateFinanceSettings($input: UpdateFinanceSettingsInput!) {
    updateFinanceSettings(input: $input) {
      platform_fee_pct
      gst_pct
      updated_at
    }
  }
`;

interface Props {
  focus?: 'fees' | 'gst' | 'all';
}

const previewAmount = 1000;

export default function FinanceSettingsPage({ focus = 'all' }: Props) {
  const { data, loading, refetch } = useQuery(FINANCE_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [updateMut, { loading: saving }] = useMutation(UPDATE);

  const [fee, setFee] = useState(0);
  const [gst, setGst] = useState(0);
  const [dummy, setDummy] = useState(true);
  const [currency, setCurrency] = useState('₹');
  const [prefix, setPrefix] = useState('DUN');
  const [bizName, setBizName] = useState('');
  const [bizAddr, setBizAddr] = useState('');
  const [bizGstin, setBizGstin] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fs = data?.financeSettings;
    if (!fs) return;
    setFee(fs.platform_fee_pct);
    setGst(fs.gst_pct);
    setDummy(fs.dummy_mode);
    setCurrency(fs.currency_symbol);
    setPrefix(fs.invoice_prefix);
    setBizName(fs.business_name);
    setBizAddr(fs.business_address);
    setBizGstin(fs.business_gstin);
  }, [data]);

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const subtotal = previewAmount;
  const feeAmt = (subtotal * fee) / 100;
  const gstAmt = ((subtotal + feeAmt) * gst) / 100;
  const total = subtotal + feeAmt + gstAmt;

  const save = async (partial?: any) => {
    setError(null);
    try {
      const input = partial || {
        platform_fee_pct: fee,
        gst_pct: gst,
        dummy_mode: dummy,
        currency_symbol: currency,
        invoice_prefix: prefix,
        business_name: bizName,
        business_address: bizAddr,
        business_gstin: bizGstin,
      };
      await updateMut({ variables: { input } });
      setToast('Saved');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const showFees = focus === 'all' || focus === 'fees';
  const showGst = focus === 'all' || focus === 'gst';

  const title =
    focus === 'fees'
      ? 'Platform Fees Management'
      : focus === 'gst'
        ? 'GST Management'
        : 'Finance Settings';

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        {focus === 'gst' ? <RequestQuoteIcon color="primary" /> : <PercentIcon color="primary" />}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tune commission, taxes and dummy-payment behavior across the app.
          </Typography>
        </Box>
        <Chip
          color={dummy ? 'warning' : 'success'}
          label={dummy ? 'Dummy mode' : 'Live mode'}
          variant="outlined"
        />
      </Stack>

      <Stack spacing={2}>
        {showFees && (
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Platform Fee
                </Typography>
                <Chip color="primary" label={`${fee}%`} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Charged on top of the booking amount before GST.
              </Typography>
              <Box sx={{ px: 2, mt: 2 }}>
                <Slider
                  value={fee}
                  onChange={(_, v) => setFee(v as number)}
                  min={0}
                  max={30}
                  step={0.5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 10, label: '10%' },
                    { value: 20, label: '20%' },
                    { value: 30, label: '30%' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v}%`}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {showGst && (
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  GST
                </Typography>
                <Chip color="warning" label={`${gst}%`} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Applied on (subtotal + platform fee).
              </Typography>
              <Box sx={{ px: 2, mt: 2 }}>
                <Slider
                  value={gst}
                  onChange={(_, v) => setGst(v as number)}
                  min={0}
                  max={28}
                  step={0.5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 5, label: '5%' },
                    { value: 12, label: '12%' },
                    { value: 18, label: '18%' },
                    { value: 28, label: '28%' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v}%`}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Preview on {currency}
              {previewAmount}
            </Typography>
            <Stack spacing={0.5}>
              <Row label="Subtotal" value={`${currency}${subtotal.toFixed(2)}`} />
              <Row label={`Platform Fee (${fee}%)`} value={`${currency}${feeAmt.toFixed(2)}`} />
              <Row label={`GST (${gst}%)`} value={`${currency}${gstAmt.toFixed(2)}`} />
              <Row label="Total" value={`${currency}${total.toFixed(2)}`} bold />
            </Stack>
          </CardContent>
        </Card>

        {focus === 'all' && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Business / Invoice details
              </Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Currency symbol"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    sx={{ width: 160 }}
                  />
                  <TextField
                    label="Invoice prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    sx={{ width: 200 }}
                  />
                  <FormControlLabel
                    control={<Switch checked={dummy} onChange={(e) => setDummy(e.target.checked)} />}
                    label="Dummy payment mode"
                  />
                </Stack>
                <TextField
                  label="Business legal name"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Business address"
                  value={bizAddr}
                  onChange={(e) => setBizAddr(e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField
                  label="GSTIN"
                  value={bizGstin}
                  onChange={(e) => setBizGstin(e.target.value)}
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="large" onClick={() => save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </Box>
      </Stack>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>
        {label}
      </Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>
        {value}
      </Typography>
    </Stack>
  );
}
