import { Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import type { InvoiceField, InvoiceSettingsForm } from './types';

interface Props {
  value: InvoiceSettingsForm;
  onChange: (field: InvoiceField, next: string) => void;
  emailError?: string | null;
}

/** Grouped MUI text fields for every invoice/ticket branding value. */
export default function InvoiceBrandingForm({ value, onChange, emailError }: Props) {
  const set = (field: InvoiceField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(field, e.target.value);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Business identity
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Shown as the issuer on every invoice and ticket.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Legal / business name"
              value={value.business_name}
              onChange={set('business_name')}
              fullWidth
              placeholder="e.g. Duncit Technologies Pvt. Ltd."
            />
            <TextField
              label="Business address"
              value={value.business_address}
              onChange={set('business_address')}
              multiline
              minRows={2}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="GSTIN" value={value.business_gstin} onChange={set('business_gstin')} fullWidth />
              <TextField
                label="Logo image URL"
                value={value.invoice_logo_url}
                onChange={set('invoice_logo_url')}
                fullWidth
                placeholder="https://…/logo.png"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Invoice document
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Document heading"
                value={value.invoice_label}
                onChange={set('invoice_label')}
                sx={{ flex: 1 }}
                placeholder="TAX INVOICE"
              />
              <TextField
                label="Currency symbol"
                value={value.currency_symbol}
                onChange={set('currency_symbol')}
                sx={{ width: 140 }}
              />
              <TextField
                label="Invoice prefix"
                value={value.invoice_prefix}
                onChange={set('invoice_prefix')}
                sx={{ width: 160 }}
              />
            </Stack>
            <Divider flexItem />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Support email"
                value={value.invoice_support_email}
                onChange={set('invoice_support_email')}
                fullWidth
                error={!!emailError}
                helperText={emailError || ' '}
              />
              <TextField
                label="Support phone"
                value={value.invoice_support_phone}
                onChange={set('invoice_support_phone')}
                fullWidth
              />
            </Stack>
            <TextField
              label="Terms & conditions"
              value={value.invoice_terms}
              onChange={set('invoice_terms')}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Footer note"
              value={value.invoice_footer_note}
              onChange={set('invoice_footer_note')}
              fullWidth
            />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
