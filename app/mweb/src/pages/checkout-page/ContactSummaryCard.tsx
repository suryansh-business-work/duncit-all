import { useWatch, type Control } from 'react-hook-form';
import { Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import type { CheckoutContact, CheckoutForm } from './queries';

interface Props {
  control: Control<CheckoutForm>;
  contact: CheckoutContact | null;
  loading: boolean;
}

interface RowProps {
  label: string;
  value: string;
  testId: string;
}

/** One label/value line in the read-only contact card. */
function ContactRow({ label, value, testId }: Readonly<RowProps>) {
  return (
    <Stack data-testid={testId} direction="row" spacing={1.5} sx={{
      alignItems: "baseline"
    }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          width: 56,
          flex: '0 0 auto',
          fontWeight: 600
        }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          minWidth: 0,
          wordBreak: 'break-word'
        }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

/** Placeholder line shown while the `me` query is still loading. */
function ContactRowSkeleton({ label, testId }: Readonly<{ label: string; testId: string }>) {
  return (
    <Stack data-testid={testId} direction="row" spacing={1.5} sx={{
      alignItems: "baseline"
    }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          width: 56,
          flex: '0 0 auto',
          fontWeight: 600
        }}>
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
  const { t } = useTranslation();
  const nameLabel = t('mweb.checkout.contactName');
  const emailLabel = t('mweb.checkout.contactEmail');
  const phoneLabel = t('mweb.checkout.contactPhone');
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
    <Stack data-testid="contact-summary-card" spacing={1.25}>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 700
        }}>
        {t('mweb.checkout.contactDetails')}
      </Typography>
      <Stack data-testid="checkout-contact-summary" spacing={0.75} sx={{ px: 1.5, py: 1.25, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        {loading ? (
          <>
            <ContactRowSkeleton label={nameLabel} testId="contact-summary-card-name" />
            <ContactRowSkeleton label={emailLabel} testId="contact-summary-card-email" />
            <ContactRowSkeleton label={phoneLabel} testId="contact-summary-card-phone" />
          </>
        ) : (
          <>
            <ContactRow label={nameLabel} value={resolvedName} testId="contact-summary-card-name" />
            <ContactRow label={emailLabel} value={resolvedEmail} testId="contact-summary-card-email" />
            <ContactRow label={phoneLabel} value={phoneLine} testId="contact-summary-card-phone" />
          </>
        )}
      </Stack>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('mweb.checkout.contactEditNote')}
      </Typography>
    </Stack>
  );
}
