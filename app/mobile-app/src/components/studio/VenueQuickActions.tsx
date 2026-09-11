import { NavRow, RowBadge, RowDivider } from '@/components/club-admin/NavRow';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';

interface Props {
  /** Only an APPROVED venue has a calendar hosts can see. */
  approved: boolean;
  pendingRequests: number;
  onNavigate: (route: MenuRoute) => void;
}

/** The three doors out of Venue Studio: the calendar, the settings and the
 * request queue — with the pending count on the one that is waiting on you.
 * One list card, as mWeb's VenueQuickActions draws it (rule 27). */
export function VenueQuickActions({ approved, pendingRequests, onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  const availabilityCaption = approved
    ? undefined
    : t('mweb.venueManagePage.approvalNeededForAvailability');
  const pendingBadge =
    pendingRequests > 0 ? (
      <RowBadge
        testID="venue-action-slot-requests-pending"
        label={t('mweb.venueManagePage.slotRequestsPending', { vars: { count: pendingRequests } })}
      />
    ) : undefined;

  return (
    <SurfaceCard padding={0} overflow="hidden" testID="venue-quick-actions">
      <NavRow
        testID="venue-action-availability"
        icon="event-repeat"
        label={t('mweb.venueManagePage.availabilityAction')}
        caption={availabilityCaption}
        captionTestID="venue-action-availability-hint"
        disabled={!approved}
        onPress={() => onNavigate('VenueAvailability')}
      />
      <RowDivider />
      <NavRow
        testID="venue-action-settings"
        icon="settings"
        label={t('mweb.venueManagePage.settingsAction')}
        onPress={() => onNavigate('VenueSettings')}
      />
      <RowDivider />
      <NavRow
        testID="venue-action-slot-requests"
        icon="event-available"
        label={t('mweb.venueManagePage.slotRequestsAction')}
        badge={pendingBadge}
        onPress={() => onNavigate('VenueSlotRequests')}
      />
    </SurfaceCard>
  );
}
