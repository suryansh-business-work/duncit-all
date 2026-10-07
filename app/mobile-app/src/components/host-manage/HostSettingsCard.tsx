import { Spinner, Text, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { PodRequestLimitForm } from '@/forms/pod-request-limit';
import { useHostRequestLimit } from '@/hooks/useHostRequestLimit';
import { useTranslation } from '@/hooks/useTranslation';
import { HostSectionHeader } from './HostSectionHeader';

/** Host Studio → Host Settings: how many Pod Requests this host may send to venues each month. */
export function HostSettingsCard() {
  const { t } = useTranslation();
  const limit = useHostRequestLimit();
  // No host profile (yet): nothing to set.
  if (!limit.isLoading && !limit.loadError && !limit.host) return null;

  return (
    <YStack gap={12} testID="host-settings">
      <HostSectionHeader title={t('podRequests.hostSettingsTitle')} testID="host-settings-title" />
      <SurfaceCard>
        {limit.isLoading && !limit.host ? (
          <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
        ) : null}
        {limit.loadError ? (
          <Text role="alert" fontSize={13} color="$danger">
            {limit.loadError}
          </Text>
        ) : null}
        {limit.host ? (
          <PodRequestLimitForm
            label={t('podRequests.hostLimitLabel')}
            initialLimit={limit.host.max_venue_requests_per_month}
            override={limit.host.venue_requests_limit_override ?? null}
            saving={limit.saving}
            saved={limit.saved}
            error={limit.saveError}
            onSubmit={limit.save}
            testID="host-venue-request-limit-form"
          />
        ) : null}
      </SurfaceCard>
    </YStack>
  );
}
