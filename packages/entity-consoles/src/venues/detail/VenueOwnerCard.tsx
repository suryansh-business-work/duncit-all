import { Divider, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { InfoRow } from '@duncit/ui';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import { hasPayout, orDash } from './venue-values';
import type { AdminVenueDetail } from './queries';

/** The owner behind the venue, their tax ids and where a payout would land.
 * Grouped in one card because an admin checking a settlement reads all three. */
export default function VenueOwnerCard({ venue }: Readonly<{ venue: AdminVenueDetail }>) {
  const { t } = useTranslation();
  const bank = venue.bank_account;

  return (
    <SectionCard icon={<PersonIcon color="primary" />} title={t('admin.venueDetails.owner')}>
      <Stack spacing={1.5}>
        <InfoRow label={t('admin.venueDetails.ownerName')} value={orDash(venue.owner_name)} />
        <InfoRow label={t('admin.venueDetails.ownerPhone')} value={orDash(venue.owner_phone)} />
        <InfoRow label={t('admin.venueDetails.ownerEmail')} value={orDash(venue.owner_email)} />
        <InfoRow
          label={t('admin.venueDetails.ownerDob')}
          value={venue.owner_dob ? formatDate(venue.owner_dob) : orDash(null)}
        />
        <InfoRow label={t('admin.venueDetails.ownerAddress')} value={orDash(venue.owner_address)} />
        <InfoRow label={t('admin.venueDetails.gstin')} value={orDash(venue.gstin)} />
        <InfoRow label={t('admin.venueDetails.pan')} value={orDash(venue.pan)} />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
        {t('admin.venueDetails.payout')}
      </Typography>
      {hasPayout(bank) ? (
        <Stack spacing={1.5}>
          <InfoRow label={t('admin.venueDetails.accountHolder')} value={orDash(bank.account_holder_name)} />
          <InfoRow label={t('admin.venueDetails.accountNumber')} value={orDash(bank.account_number)} />
          <InfoRow label={t('admin.venueDetails.ifsc')} value={orDash(bank.ifsc_code)} />
          <InfoRow label={t('admin.venueDetails.upiId')} value={orDash(bank.upi_id)} />
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.venueDetails.noPayout')}
        </Typography>
      )}
    </SectionCard>
  );
}
