import { Fragment, type ReactNode } from 'react';
import { Linking } from 'react-native';
import { Text, YStack } from 'tamagui';
import { partnerPortalUrl } from '@duncit/onboarding';

import { DuncitButton } from '@/components/DuncitButton';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { SelectedVenueBar } from '@/components/studio-options/SelectedVenueBar';
import { useFoodDeskVenues } from '@/hooks/useFoodDesk';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  title: string;
  testID: string;
  /**
   * What the venue misses while food is off — the screen's own sentence. Left
   * out, the tool shows for every venue: the Food Menu is where food is switched on.
   */
  noFoodMessage?: string;
  /** The screen's tool for the selected food-serving venue. */
  children: (venueId: string) => ReactNode;
}

/**
 * The frame of the four food desk screens — Dashboard, Food Menu, Food Orders,
 * Food Coupons: the venue picked at the top (remembered for every venue screen),
 * then the tool for it. A venue that serves no food has nothing here; it gets
 * the way to switch food on in its venue form, a Partner console page. The
 * native twin of the pages @duncit/venue-food draws on the web.
 */
export function FoodDeskFrame({ title, testID, noFoodMessage, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const { venues, venue, selectVenue, isLoading, error } = useFoodDeskVenues();
  const shown = venue && (venue.offers_food || noFoodMessage === undefined) ? venue : null;

  return (
    <StackScreen title={title} testID={testID}>
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          <SelectedVenueBar
            venues={venues}
            venue={venue}
            onSelect={selectVenue}
            isLoading={isLoading}
            error={error}
          />
          {venue && !shown ? (
            <SurfaceCard testID={`${testID}-no-food`} gap={12}>
              <Text role="status" fontSize={14} color="$muted">
                {noFoodMessage}
              </Text>
              <DuncitButton
                testID={`${testID}-edit-venue`}
                label={t('venueFoodOwner.common.editVenue')}
                variant="ghost"
                onPress={() =>
                  fireAndForget(
                    Linking.openURL(
                      partnerPortalUrl(`/register-venue/${venue.id}?selectedtab=food`),
                    ),
                  )
                }
              />
            </SurfaceCard>
          ) : null}
          {shown ? <Fragment key={shown.id}>{children(shown.id)}</Fragment> : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
