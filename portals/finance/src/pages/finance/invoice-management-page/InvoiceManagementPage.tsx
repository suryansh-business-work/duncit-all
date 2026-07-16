import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { notifySuccess } from '@duncit/dialogs';
import { INVOICE_SETTINGS, UPDATE_INVOICE_SETTINGS } from './queries';
import { EMPTY_INVOICE_SETTINGS, type InvoiceField, type InvoiceSettingsForm } from './types';
import InvoiceBrandingForm from './InvoiceBrandingForm';
import InvoicePreview from './InvoicePreview';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Finance → Invoice Management. Single source of truth for the text + components
 * rendered on every invoice and ticket PDF; changes apply on the next document. */
export default function InvoiceManagementPage() {
  const { data, loading, refetch } = useQuery(INVOICE_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [updateMut, { loading: saving }] = useMutation(UPDATE_INVOICE_SETTINGS);
  const [form, setForm] = useState<InvoiceSettingsForm>(EMPTY_INVOICE_SETTINGS);
  const [dummyMode, setDummyMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fs = data?.financeSettings;
    if (!fs) return;
    setDummyMode(fs.dummy_mode ?? true);
    setForm({
      business_name: fs.business_name ?? '',
      business_address: fs.business_address ?? '',
      business_gstin: fs.business_gstin ?? '',
      currency_symbol: fs.currency_symbol ?? '₹',
      invoice_prefix: fs.invoice_prefix ?? 'DUN',
      invoice_label: fs.invoice_label ?? 'TAX INVOICE',
      invoice_support_email: fs.invoice_support_email ?? '',
      invoice_support_phone: fs.invoice_support_phone ?? '',
      invoice_footer_note: fs.invoice_footer_note ?? '',
      invoice_terms: fs.invoice_terms ?? '',
      invoice_logo_url: fs.invoice_logo_url ?? '',
    });
  }, [data]);

  const emailError = useMemo(
    () => (form.invoice_support_email && !EMAIL_RE.test(form.invoice_support_email) ? 'Enter a valid email' : null),
    [form.invoice_support_email]
  );

  const onChange = (field: InvoiceField, next: string) => setForm((p) => ({ ...p, [field]: next }));

  const save = async () => {
    setError(null);
    if (emailError) {
      setError('Please fix the support email before saving.');
      return;
    }
    try {
      await updateMut({ variables: { input: { ...form, dummy_mode: dummyMode } } });
      notifySuccess('Invoice settings saved');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <DescriptionIcon color="primary" sx={{ fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Invoice Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Control the branding and text rendered on every tax invoice and event ticket.
          </Typography>
        </Box>
        <Button variant="contained" size="large" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, width: '100%' }}>
          <Stack spacing={2}>
            <InvoiceBrandingForm value={form} onChange={onChange} emailError={emailError} />
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Payment processing
                </Typography>
                <FormControlLabel
                  control={<Switch checked={dummyMode} onChange={(e) => setDummyMode(e.target.checked)} />}
                  label={dummyMode ? 'Dummy payment mode (no live charges)' : 'Live payment mode (Razorpay)'}
                />
              </CardContent>
            </Card>
          </Stack>
        </Box>
        <Box sx={{ flex: 1, width: '100%', position: { md: 'sticky' }, top: { md: 16 } }}>
          <Typography variant="overline" color="text.secondary">Live preview</Typography>
          <InvoicePreview value={form} />
        </Box>
      </Stack>
    </Box>
  );
}
