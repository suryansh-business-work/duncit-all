import { Box, Divider, Stack, Typography } from '@mui/material';
import type { InvoiceSettingsForm } from './types';

const ACCENT = '#ff4f73';
// GST-inclusive sample matching the settlement engine: the customer pays 1000
// (GST-inclusive); GST is extracted (1000×18/118), leaving the net taxable value.
const SAMPLE = { subtotal: 847.46, gst: 152.54, total: 1000 };

/** A faithful, lightweight mirror of the generated invoice PDF so admins see the
 * effect of their edits live — uses sample figures, real branding values. */
export default function InvoicePreview({ value }: Readonly<{ value: InvoiceSettingsForm }>) {
  const c = value.currency_symbol || '₹';
  const money = (n: number) => `${c}${n.toFixed(2)}`;

  return (
    <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: '#fff', color: '#111827' }}>
      <Box sx={{ bgcolor: ACCENT, color: '#fff', px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {value.invoice_logo_url ? (
          <Box component="img" src={value.invoice_logo_url} alt="logo" sx={{ height: 34, maxWidth: 150, objectFit: 'contain' }} />
        ) : (
          <Typography fontWeight={900} fontSize={20}>{value.business_name || 'Your business'}</Typography>
        )}
        <Typography fontWeight={900} fontSize={16} letterSpacing={1}>{value.invoice_label || 'TAX INVOICE'}</Typography>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 230 }}>
            <Typography fontWeight={800}>{value.business_name || 'Your business'}</Typography>
            {value.business_address && <Typography variant="caption" color="text.secondary" display="block">{value.business_address}</Typography>}
            {value.business_gstin && <Typography variant="caption" color="text.secondary">GSTIN: {value.business_gstin}</Typography>}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Invoice No</Typography>
            <Typography fontWeight={800}>{value.invoice_prefix || 'DUN'}/2526/000123</Typography>
            <Typography variant="caption" color="text.secondary" display="block">Date: {new Date().toLocaleDateString('en-IN')}</Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 2, bgcolor: '#fff1f4', borderRadius: 2, p: 1.5 }}>
          <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 800 }}>BILL TO</Typography>
          <Typography fontWeight={800}>Riya Sharma</Typography>
          <Typography variant="caption" color="text.secondary">riya@example.com · +91 90000 00000</Typography>
        </Box>

        <Box sx={{ mt: 2, bgcolor: ACCENT, color: '#fff', px: 1.5, py: 0.75, borderRadius: 1, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}>
          <span>DESCRIPTION</span><span>AMOUNT</span>
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{ px: 1.5, py: 1, borderBottom: '1px solid #eee' }}>
          <Typography variant="body2">Pod booking · Sample experience</Typography>
          <Typography variant="body2">{money(SAMPLE.subtotal)}</Typography>
        </Stack>

        <Stack spacing={0.4} sx={{ mt: 1.5, ml: 'auto', maxWidth: 240 }}>
          <Row label="Taxable value" value={money(SAMPLE.subtotal)} />
          <Row label="GST (18%)" value={money(SAMPLE.gst)} />
          <Divider />
          <Row label="Total Paid" value={money(SAMPLE.total)} bold />
        </Stack>

        <Box sx={{ mt: 2 }}>
          {(value.invoice_support_email || value.invoice_support_phone) && (
            <Typography variant="caption" color="text.secondary" display="block">
              {[value.invoice_support_email && `Email: ${value.invoice_support_email}`, value.invoice_support_phone && `Phone: ${value.invoice_support_phone}`].filter(Boolean).join('   ·   ')}
            </Typography>
          )}
          {value.invoice_terms && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              <b>Terms:</b> {value.invoice_terms}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', textAlign: 'center', mt: 1 }}>
            {value.invoice_footer_note || 'This is a computer-generated invoice and does not require a signature.'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" fontWeight={bold ? 900 : 500} color={bold ? 'text.primary' : 'text.secondary'}>{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 900 : 500} sx={{ color: bold ? ACCENT : 'inherit' }}>{value}</Typography>
    </Stack>
  );
}
