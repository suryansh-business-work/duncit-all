import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import QuickActionList, { type QuickAction } from '../../components/club-admin/QuickActionList';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** Only an approved venue can publish slots, so the calendar waits on it. */
  approved: boolean;
  pendingRequests: number;
}

/**
 * Venue Studio's quick actions: the availability calendar, the venue settings
 * and the slot-request queue with its pending count — rows of one list card.
 * Native twin (rule 27).
 */
export default function VenueQuickActions({ approved, pendingRequests }: Readonly<Props>) {
  const { t } = useTranslation();
  const availabilityCaption = approved
    ? undefined
    : t('mweb.venueManagePage.approvalNeededForAvailability');
  const pendingBadge =
    pendingRequests > 0
      ? t('mweb.venueManagePage.slotRequestsPending', { vars: { count: pendingRequests } })
      : undefined;
  const actions: QuickAction[] = [
    {
      key: 'availability',
      icon: <EventRepeatRoundedIcon fontSize="small" />,
      label: t('mweb.venueManagePage.availabilityAction'),
      caption: availabilityCaption,
      to: '/venues/availability',
      disabled: !approved,
    },
    {
      key: 'settings',
      icon: <SettingsRoundedIcon fontSize="small" />,
      label: t('mweb.venueManagePage.settingsAction'),
      to: '/venues/settings',
    },
    {
      key: 'slot-requests',
      icon: <EventAvailableRoundedIcon fontSize="small" />,
      label: t('mweb.venueManagePage.slotRequestsAction'),
      badge: pendingBadge,
      to: '/venues/slot-requests',
    },
  ];

  return <QuickActionList actions={actions} testId="venue-quick-actions" />;
}
