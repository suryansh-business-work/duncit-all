import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import PercentIcon from '@mui/icons-material/Percent';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { FINANCE_SETTINGS, PREVIEW_AMOUNT, UPDATE_FINANCE_SETTINGS } from './queries';
import PercentSliderCard from './PercentSliderCard';
import BusinessDetailsCard from './BusinessDetailsCard';
import PreviewCard from './PreviewCard';

interface Props {
  focus?: 'fees' | 'gst' | 'all';
}

export default function FinanceSettingsPage({ focus = 'all' }: Props) {
  const { data, loading, refetch } = useQuery(FINANCE_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateMut, { loading: saving }] = useMutation(UPDATE_FINANCE_SETTINGS);

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

  const subtotal = PREVIEW_AMOUNT;
  const feeAmt = (subtotal * fee) / 100;
  const gstAmt = ((subtotal + feeAmt) * gst) / 100;
  const total = subtotal + feeAmt + gstAmt;

  const save = async () => {
    setError(null);
    try {
      await updateMut({
        variables: {
          input: {
            platform_fee_pct: fee,
            gst_pct: gst,
            dummy_mode: dummy,
            currency_symbol: currency,
            invoice_prefix: prefix,
            business_name: bizName,
            business_address: bizAddr,
            business_gstin: bizGstin,
          },
        },
      });
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
          <PercentSliderCard
            title="Platform Fee"
            helperText="Charged on top of the booking amount before GST."
            value={fee}
            onChange={setFee}
            chipColor="primary"
            max={30}
            marks={[
              { value: 0, label: '0%' },
              { value: 10, label: '10%' },
              { value: 20, label: '20%' },
              { value: 30, label: '30%' },
            ]}
          />
        )}

        {showGst && (
          <PercentSliderCard
            title="GST"
            helperText="Applied on (subtotal + platform fee)."
            value={gst}
            onChange={setGst}
            chipColor="warning"
            max={28}
            marks={[
              { value: 0, label: '0%' },
              { value: 5, label: '5%' },
              { value: 12, label: '12%' },
              { value: 18, label: '18%' },
              { value: 28, label: '28%' },
            ]}
          />
        )}

        <PreviewCard
          currency={currency}
          subtotal={subtotal}
          fee={fee}
          feeAmt={feeAmt}
          gst={gst}
          gstAmt={gstAmt}
          total={total}
        />

        {focus === 'all' && (
          <BusinessDetailsCard
            currency={currency}
            setCurrency={setCurrency}
            prefix={prefix}
            setPrefix={setPrefix}
            dummy={dummy}
            setDummy={setDummy}
            bizName={bizName}
            setBizName={setBizName}
            bizAddr={bizAddr}
            setBizAddr={setBizAddr}
            bizGstin={bizGstin}
            setBizGstin={setBizGstin}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="large" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast || ''}
      />
    </Box>
  );
}
