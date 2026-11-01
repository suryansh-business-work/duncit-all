import { Box, Stack } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import { DistributionCard, InfoRow, SectionCard, StatCard } from '@duncit/ui';
import { asCount, platformLabel } from '../labels';
import type { ProductUserProfile } from '../queries';

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } } as const;

/** One member as the app saw them: identity and origin on the left, usage and outcomes as tiles. */
export default function UserProfileCard({ profile }: Readonly<{ profile: ProductUserProfile }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const when = (iso?: string | null) => (iso ? formatDateTime(iso) : EM_DASH);
  const facts: Array<[string, string]> = [
    ['analytics.product.users.registered', when(profile.registered_at)],
    ['analytics.product.users.firstSeen', when(profile.first_seen_at)],
    ['analytics.product.users.lastSeen', when(profile.last_seen_at)],
    ['analytics.product.col.platform', profile.platform ? platformLabel(profile.platform, t) : EM_DASH],
    ['analytics.product.col.appVersion', profile.app_version || EM_DASH],
    ['analytics.product.users.city', profile.city || EM_DASH],
    ['analytics.product.users.country', profile.country || EM_DASH],
    ['analytics.product.users.firstTouch', profile.first_touch || EM_DASH],
    ['analytics.product.users.lastTouch', profile.last_touch || EM_DASH],
  ];
  const tiles: Array<[string, number]> = [
    ['analytics.product.users.sessions', profile.sessions],
    ['analytics.product.users.screenViews', profile.screen_views],
    ['analytics.product.users.events', profile.events],
    ['analytics.product.users.featuresUsed', profile.features_used],
    ['analytics.product.users.podsCreated', profile.pods_created],
    ['analytics.product.users.podsJoined', profile.pods_joined],
    ['analytics.product.users.paymentsCompleted', profile.payments_completed],
  ];
  return (
    <Stack spacing={2} data-testid="product-user-profile">
      <SectionCard title={profile.name || profile.user_id} subtitle={profile.user_id}>
        <Stack spacing={0.5}>
          {facts.map(([label, value]) => (
            <InfoRow key={label} label={t(label)} value={value} />
          ))}
        </Stack>
      </SectionCard>
      <Box sx={GRID}>
        {tiles.map(([label, value]) => (
          <StatCard key={label} label={t(label)} value={asCount(value)} />
        ))}
      </Box>
      <DistributionCard
        title={t('analytics.product.users.topScreens')}
        buckets={profile.top_features}
        emptyText={t('analytics.product.empty')}
      />
    </Stack>
  );
}
