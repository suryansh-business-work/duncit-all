import { Text, XStack, YStack } from 'tamagui';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';

interface Props {
  /** Only an APPROVED venue has a calendar hosts can see. */
  approved: boolean;
  pendingRequests: number;
  onNavigate: (route: MenuRoute) => void;
}

/** The three doors out of Venue Studio: the calendar, the settings and the
 * request queue — with the pending count on the one that is waiting on you. */
export function VenueQuickActions({ approved, pendingRequests, onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, muted } = useThemeColors();

  const pendingChip =
    pendingRequests > 0 ? (
      <XStack
        testID="venue-action-slot-requests-pending"
        paddingHorizontal={8}
        paddingVertical={3}
        borderRadius={999}
        backgroundColor="$primary"
      >
        <Text fontSize={11} fontWeight="700" color="$onPrimary">
          {t('mweb.venueManagePage.slotRequestsPending', { vars: { count: pendingRequests } })}
        </Text>
      </XStack>
    ) : undefined;

  return (
    <YStack gap={8} testID="venue-quick-actions">
      <ActionRow
        testID="venue-action-availability"
        icon="event-repeat"
        label={t('mweb.venueManagePage.availabilityAction')}
        tint={approved ? primary : muted}
        disabled={!approved}
        onPress={() => onNavigate('VenueAvailability')}
      />
      {approved ? null : (
        <Text testID="venue-action-availability-hint" fontSize={11.5} color="$muted">
          {t('mweb.venueManagePage.approvalNeededForAvailability')}
        </Text>
      )}
      <ActionRow
        testID="venue-action-settings"
        icon="settings"
        label={t('mweb.venueManagePage.settingsAction')}
        tint={primary}
        onPress={() => onNavigate('VenueSettings')}
      />
      <ActionRow
        testID="venue-action-slot-requests"
        icon="event-available"
        label={t('mweb.venueManagePage.slotRequestsAction')}
        tint={primary}
        trailing={pendingChip}
        onPress={() => onNavigate('VenueSlotRequests')}
      />
    </YStack>
  );
}
