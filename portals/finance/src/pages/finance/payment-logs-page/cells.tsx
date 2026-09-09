/**
 * Cell renderers shared by every finance table that lists payments.
 *
 * Payment Logs and User Refund Logs show the same buyer and the same pair of
 * identifiers, so the two-line layouts live here rather than once per table —
 * a second copy is how the two screens start labelling one payment differently.
 * Both take the narrowest row shape they read, so any row carrying those fields
 * can use them.
 */
import { Stack, Typography } from '@mui/material';

export const renderPaymentCustomer = (p: Readonly<{ user_name: string; user_email: string }>) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{
      fontWeight: 600
    }}>
      {p.user_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {p.user_email}
    </Typography>
  </Stack>
);

export const renderPaymentIds = (
  p: Readonly<{ payment_id: string; invoice_no: string | null }>,
) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
      {p.payment_id}
    </Typography>
    {p.invoice_no && (
      <Typography
        variant="caption"
        component="span"
        sx={{
          color: "text.secondary",
          fontFamily: 'monospace'
        }}>
        {p.invoice_no}
      </Typography>
    )}
  </Stack>
);
