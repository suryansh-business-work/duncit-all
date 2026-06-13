import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { INVOICE_TEMPLATES, KIND_META, UPDATE_INVOICE_TEMPLATE, type InvoiceKind } from './queries';

interface Props {
  kind: InvoiceKind;
}

const BLANK = { label: '', terms: '', footer: '', note: '' };

export default function InvoiceTemplatePage({ kind }: Readonly<Props>) {
  const { data, loading, refetch } = useQuery(INVOICE_TEMPLATES, { fetchPolicy: 'cache-and-network' });
  const [updateMut, { loading: saving }] = useMutation(UPDATE_INVOICE_TEMPLATE);
  const [form, setForm] = useState(BLANK);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = KIND_META[kind];

  useEffect(() => {
    const tmpl = data?.financeSettings?.invoice_templates?.[kind];
    if (tmpl) setForm({ label: tmpl.label ?? '', terms: tmpl.terms ?? '', footer: tmpl.footer ?? '', note: tmpl.note ?? '' });
  }, [data, kind]);

  const set = (field: keyof typeof BLANK) => (value: string) => setForm((p) => ({ ...p, [field]: value }));

  const save = async () => {
    setError(null);
    try {
      await updateMut({ variables: { input: { invoice_templates: { [kind]: form } } } });
      setToast('Invoice template saved');
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
        <ReceiptLongIcon color="primary" sx={{ fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {meta.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meta.subtitle}
          </Typography>
        </Box>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Document heading" value={form.label} onChange={(e) => set('label')(e.target.value)} fullWidth placeholder={meta.title.toUpperCase()} />
            <TextField label="Terms & conditions" value={form.terms} onChange={(e) => set('terms')(e.target.value)} multiline minRows={3} fullWidth />
            <TextField label="Footer note" value={form.footer} onChange={(e) => set('footer')(e.target.value)} fullWidth />
            <TextField label="Email note (covering message)" value={form.note} onChange={(e) => set('note')(e.target.value)} multiline minRows={2} fullWidth />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            Business identity (name, address, GSTIN, logo, currency) is shared — set it under Invoices → Business Identity.
          </Typography>
        </CardContent>
      </Card>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
