import { Stack, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import type { VenueSettings } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type Cancellation = VenueSettings['cancellation'];

/** One band read back as a sentence. A band charges for cancelling INSIDE its
 * window, which is the part a table of numbers never makes obvious. */
const tierLine = (tier: Cancellation['tiers'][number], t: Translate) => {
  const key =
    tier.charge_type === 'PERCENT' ? 'admin.venueDetails.tierPercent' : 'admin.venueDetails.tierAmount';
  return t(key, { vars: { hours: tier.hours_before, value: tier.value } });
};

/** Hoisted so the three outcomes are early returns rather than a reassigned
 * variable — reschedule-only wins, then an empty policy, then the bands. */
function PolicyBody({ policy, t }: Readonly<{ policy: Cancellation; t: Translate }>) {
  if (policy?.reschedule_only) {
    return <Typography variant="body2">{t('venueSettings.rescheduleOnly')}</Typography>;
  }
  const tiers = policy?.tiers ?? [];
  if (tiers.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('venueSettings.noBands')}
      </Typography>
    );
  }
  return (
    <Stack spacing={0.75}>
      {tiers.map((tier) => (
        <Typography key={`${tier.hours_before}-${tier.charge_type}`} variant="body2">
          {tierLine(tier, t)}
        </Typography>
      ))}
    </Stack>
  );
}

export default function VenueCancellationCard({ settings }: Readonly<{ settings: VenueSettings }>) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<EventBusyIcon color="primary" />} title={t('venueSettings.cancellationTitle')}>
      <PolicyBody policy={settings.cancellation} t={t} />
    </SectionCard>
  );
}
