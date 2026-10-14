import { Linking } from 'react-native';
import { Spinner, Text, YStack } from 'tamagui';
import { partnerPortalUrl } from '@duncit/onboarding';
import { isFoodMenuEditable } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useFoodMenu } from '@/hooks/useFoodMenu';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { FoodMenuForm } from './FoodMenuForm';

/**
 * The selected venue's food menu: read with the menu's caps, then the form.
 * A venue still on its way to approval edits its menu in the venue form, a
 * Partner console page, which this links to.
 */
export function VenueFoodMenuBody({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { venue, config, error, isLoading, refetch, replaceVenue } = useFoodMenu(venueId);

  if (isLoading && !venue) {
    return (
      <Spinner
        role="progressbar"
        aria-label={t('venueFoodOwner.common.loading')}
        color="$primary"
      />
    );
  }
  if (error || !venue || !config) {
    return (
      <SurfaceCard gap={12} testID="food-menu-load-error">
        <Text role="alert" fontSize={13} color="$danger">
          {error ?? t('venueFoodOwner.menu.loadFailed')}
        </Text>
        <DuncitButton
          testID="food-menu-retry"
          label={t('venueFoodOwner.common.retry')}
          variant="ghost"
          onPress={() => fireAndForget(refetch())}
        />
      </SurfaceCard>
    );
  }
  if (!isFoodMenuEditable(venue)) {
    return (
      <SurfaceCard gap={12} testID="food-menu-not-approved">
        <Text role="status" fontSize={14} color="$muted">
          {t('venueFoodOwner.menu.notApproved')}
        </Text>
        <DuncitButton
          testID="food-menu-edit-venue"
          label={t('venueFoodOwner.common.editVenue')}
          variant="ghost"
          onPress={() =>
            fireAndForget(
              Linking.openURL(partnerPortalUrl(`/register-venue/${venue.id}?selectedtab=food`)),
            )
          }
        />
      </SurfaceCard>
    );
  }

  return (
    <YStack>
      <FoodMenuForm key={venue.id} venue={venue} config={config} onSaved={replaceVenue} />
    </YStack>
  );
}
