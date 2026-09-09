import { Stack, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import type { VenueSettings } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** One band read back as a sentence. A band charges for cancelling INSIDE its
 * window, which is the part a table of numbers never makes obvious. */
const tierLine = (tier: VenueSettings['cancellation']['tiers'][number], t: Translate) => {
  const key =
    tier.charge_type === 'PERCENT' ? 'admin.venueDetails.tierPercent' : 'admin.venueDetails.tierAmount';
  return t(key, { vars: { hours: tier.hours_before, value: tier.value } });
};

export default function VenueCancellationCard({ settings }: Readonly<{ settings: VenueSettings }>) {
  const { t } = useTranslation();
  const policy = settings.cancellation;
  const tiers = policy?.tiers ?? [];

  let body = (
    <Stack spacing={0.75}>
      {tiers.map((tier) => (
        <Typography key={`${tier.hours_before}-${tier.charge_type}`} variant="body2">
          {tierLine(tier, t)}
        </Typography>
      ))}
    </Stack>
  );
  if (policy?.reschedule_only) {
    body = (
      <Typography variant="body2">{t('venueSettings.rescheduleOnly')}</Typography>
    );
  } else if (tiers.length === 0) {
    body = (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('venueSettings.noBands')}
      </Typography>
    );
  }

  return (
    <SectionCard icon={<EventBusyIcon color="primary" />} title={t('venueSettings.cancellationTitle')}>
      {body}
    </SectionCard>
  );
}
