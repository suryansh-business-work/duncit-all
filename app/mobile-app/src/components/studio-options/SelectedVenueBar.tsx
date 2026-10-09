import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { canSwitchVenues, venueLabel, venueSubLabel, type SwitchableVenue } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { VenueSwitcher } from '@/components/studio';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  venues: readonly SwitchableVenue[];
  venue: SwitchableVenue | null;
  onSelect: (venueId: string) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * The top of every Venue Options page: which venue the page is about. Several
 * venues get the switcher (the pick is remembered for every venue screen); one
 * venue is simply named; none says so. Loading and a failed load are their own
 * states, so an owner is never told they have no venues when the list did not
 * arrive. mWeb twin: studio-options/SelectedVenueBar.
 */
export function SelectedVenueBar({ venues, venue, onSelect, isLoading, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();

  if (isLoading && venues.length === 0) {
    return <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />;
  }
  if (error) {
    return (
      <Text role="alert" testID="selected-venue-error" fontSize={13} color="$danger">
        {error}
      </Text>
    );
  }
  if (!venue) {
    return (
      <Text role="status" testID="selected-venue-empty" fontSize={14} color="$muted">
        {t('mweb.studioOptions.noVenuesYet')}
      </Text>
    );
  }
  if (canSwitchVenues(venues)) {
    return (
      <YStack gap={6}>
        <VenueSwitcher venues={venues} venueId={venue.id} onSelect={onSelect} />
        <Text testID="selected-venue-hint" fontSize={12} color="$muted">
          {t('mweb.studioOptions.selectVenueHint')}
        </Text>
      </YStack>
    );
  }
  return (
    <SurfaceCard testID="selected-venue-single">
      <XStack alignItems="center" gap={12}>
        <MaterialIcons name="store" size={20} color={accent} />
        <YStack flex={1} minWidth={0}>
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t('mweb.studioOptions.selectedVenue')}
          </Text>
          <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
            {venueLabel(venue, t('mweb.venueManagePage.untitledVenue'))}
          </Text>
          <Text fontSize={12} color="$muted" numberOfLines={1}>
            {venueSubLabel(venue)}
          </Text>
        </YStack>
      </XStack>
    </SurfaceCard>
  );
}
