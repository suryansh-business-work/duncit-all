import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';
import { partnerPortalUrl } from '@duncit/onboarding';

import { DuncitButton } from '@/components/DuncitButton';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { VenueListRow } from '@/components/studio-options/VenueListRow';
import { useMyVenues } from '@/hooks/useMyVenues';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Registering and editing a venue are Partner console flows; the app opens them there. */
const openPortal = (path: string) => fireAndForget(Linking.openURL(partnerPortalUrl(path)));

/**
 * Venue Options → Your Venues (/venues/list): every venue the owner has, with
 * its city and status. Tapping one selects it for every venue screen and opens
 * the Venue dashboard on it; "Add a venue" and Edit open the Partner console's
 * venue registration. mWeb twin: pages/venues/VenueListPage.
 */
export function VenueListScreen() {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { venues, venueId, selectVenue, isLoading, error } = useMyVenues();

  const open = (id: string) => {
    selectVenue(id);
    navigation.navigate('VenueManage');
  };

  return (
    <StackScreen title={t('mweb.studioOptions.yourVenues')} testID="venue-list-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          <DuncitButton
            testID="venue-list-add"
            label={t('mweb.studioOptions.addVenue')}
            icon={<MaterialIcons name="add" size={18} color={onPrimary} />}
            onPress={() => openPortal('/register-venue/new')}
          />
          {isLoading && venues.length === 0 ? (
            <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
          ) : null}
          {error ? (
            <Text role="alert" testID="venue-list-error" fontSize={13} color="$danger">
              {error}
            </Text>
          ) : null}
          {!isLoading && !error && venues.length === 0 ? (
            <Text role="status" testID="venue-list-empty" fontSize={14} color="$muted">
              {t('mweb.studioOptions.noVenuesYet')}
            </Text>
          ) : null}
          {venues.length > 0 ? (
            <SurfaceCard testID="venue-list" padding={0} paddingVertical={4} overflow="hidden">
              {venues.map((venue, index) => (
                <YStack
                  key={venue.id}
                  borderTopWidth={index === 0 ? 0 : 1}
                  borderColor="$borderColor"
                >
                  <VenueListRow
                    venue={venue}
                    selected={venue.id === venueId}
                    onOpen={() => open(venue.id)}
                    onEdit={() => openPortal(`/register-venue/${venue.id}`)}
                  />
                </YStack>
              ))}
            </SurfaceCard>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
