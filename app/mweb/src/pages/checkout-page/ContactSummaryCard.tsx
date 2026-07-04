import { useWatch, type Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import type { CheckoutForm } from './queries';

interface Props {
  control: Control<CheckoutForm>;
}

interface RowProps {
  label: string;
  value: string;
}

/** One label/value line in the read-only contact card. */
function ContactRow({ label, value }: Readonly<RowProps>) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="baseline">
      <Typography variant="caption" color="text.secondary" sx={{ width: 56, flex: '0 0 auto', fontWeight: 800 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

/**
 * Read-only summary of the buyer's contact details. The values stay in the form
 * state (prefilled from `me` and sent on pay) but can no longer be edited here —
 * the buyer changes them from their profile instead.
 */
export default function ContactSummaryCard({ control }: Readonly<Props>) {
  const [fullName, email, ext, phone] = useWatch({
    control,
    name: ['full_name', 'email', 'phone_extension', 'phone_number'],
  });
  const phoneLine = [ext, phone].filter(Boolean).join(' ');

  return (
    <Stack spacing={1.25}>
      <Typography variant="overline" color="text.secondary" fontWeight={900}>
        Contact details
      </Typography>
      <Stack spacing={0.75} sx={{ px: 1.5, py: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <ContactRow label="Name" value={fullName ?? ''} />
        <ContactRow label="Email" value={email ?? ''} />
        <ContactRow label="Phone" value={phoneLine} />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        To change these, edit your profile.
      </Typography>
    </Stack>
  );
}
