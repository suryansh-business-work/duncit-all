import { useWatch, type Control } from 'react-hook-form';
import { Skeleton, Stack, Typography } from '@mui/material';
import type { CheckoutContact, CheckoutForm } from './queries';

interface Props {
  control: Control<CheckoutForm>;
  contact: CheckoutContact | null;
  loading: boolean;
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

/** Placeholder line shown while the `me` query is still loading. */
function ContactRowSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="baseline">
      <Typography variant="caption" color="text.secondary" sx={{ width: 56, flex: '0 0 auto', fontWeight: 800 }}>
        {label}
      </Typography>
      <Skeleton variant="text" width="62%" sx={{ minWidth: 0 }} />
    </Stack>
  );
}

/**
 * Read-only summary of the buyer's contact details. Values come straight from
 * the loaded `me` query (props), falling back to the form state so the display
 * never depends on the prefill reset landing before render. They stay in the
 * form state (sent on pay) but are edited from the profile, not here.
 */
export default function ContactSummaryCard({ control, contact, loading }: Readonly<Props>) {
  const [fullName, email, ext, phone] = useWatch({
    control,
    name: ['full_name', 'email', 'phone_extension', 'phone_number'],
  });
  const resolvedName = contact?.fullName || fullName || '';
  const resolvedEmail = contact?.email || email || '';
  const resolvedExt = contact?.phoneExtension || ext || '';
  const resolvedPhone = contact?.phoneNumber || phone || '';
  const phoneLine = [resolvedExt, resolvedPhone].filter(Boolean).join(' ');

  return (
    <Stack spacing={1.25}>
      <Typography variant="overline" color="text.secondary" fontWeight={900}>
        Contact details
      </Typography>
      <Stack spacing={0.75} sx={{ px: 1.5, py: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        {loading ? (
          <>
            <ContactRowSkeleton label="Name" />
            <ContactRowSkeleton label="Email" />
            <ContactRowSkeleton label="Phone" />
          </>
        ) : (
          <>
            <ContactRow label="Name" value={resolvedName} />
            <ContactRow label="Email" value={resolvedEmail} />
            <ContactRow label="Phone" value={phoneLine} />
          </>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        To change these, edit your profile.
      </Typography>
    </Stack>
  );
}
