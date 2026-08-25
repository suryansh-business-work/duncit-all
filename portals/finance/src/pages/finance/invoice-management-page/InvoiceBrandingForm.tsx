import { Card, CardContent, Divider, Stack, TextField, Typography } from '@mui/material';
import type { InvoiceField, InvoiceSettingsForm } from './types';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  value: InvoiceSettingsForm;
  onChange: (field: InvoiceField, next: string) => void;
  emailError?: string | null;
}

/** Grouped MUI text fields for every invoice/ticket branding value. */
export default function InvoiceBrandingForm({ value, onChange, emailError }: Readonly<Props>) {
  const { t } = useTranslation();
  const set = (field: InvoiceField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(field, e.target.value);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{
            fontWeight: 700
          }}>
            Business identity
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 2
            }}>
            Shown as the issuer on every invoice and ticket.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t('finance.invoiceManagement.legalBusinessName')}
              value={value.business_name}
              onChange={set('business_name')}
              fullWidth
              placeholder={t('finance.invoiceManagement.eGDuncitTechnologiesPvtLtd')}
            />
            <TextField
              label={t('finance.invoiceManagement.businessAddress')}
              value={value.business_address}
              onChange={set('business_address')}
              multiline
              minRows={2}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="GSTIN" value={value.business_gstin} onChange={set('business_gstin')} fullWidth />
              <TextField
                label={t('finance.invoiceManagement.logoImageUrl')}
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
          <Typography variant="subtitle1" gutterBottom sx={{
            fontWeight: 700
          }}>
            Invoice document
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('finance.common.documentHeading')}
                value={value.invoice_label}
                onChange={set('invoice_label')}
                sx={{ flex: 1 }}
                placeholder={t('finance.invoiceManagement.taxInvoice')}
              />
              <TextField
                label={t('finance.invoiceManagement.currencySymbol')}
                value={value.currency_symbol}
                onChange={set('currency_symbol')}
                sx={{ width: 140 }}
              />
              <TextField
                label={t('finance.invoiceManagement.invoicePrefix')}
                value={value.invoice_prefix}
                onChange={set('invoice_prefix')}
                sx={{ width: 160 }}
              />
            </Stack>
            <Divider flexItem />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('finance.invoiceManagement.supportEmail')}
                value={value.invoice_support_email}
                onChange={set('invoice_support_email')}
                fullWidth
                error={!!emailError}
                helperText={emailError || ' '}
              />
              <TextField
                label={t('finance.invoiceManagement.supportPhone')}
                value={value.invoice_support_phone}
                onChange={set('invoice_support_phone')}
                fullWidth
              />
            </Stack>
            <TextField
              label={t('finance.common.termsAndConditions')}
              value={value.invoice_terms}
              onChange={set('invoice_terms')}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label={t('finance.common.footerNote')}
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
