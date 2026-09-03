import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from '../../i18n/useTranslation';

interface Action {
  key: string;
  icon: ReactNode;
  label: string;
  /** The line under the label — a pending count, or why the action is off. */
  caption?: string;
  to: string;
  disabled?: boolean;
}

/** A link while the action is open; a disabled surface while it is not. */
function ActionSurface({ action, children }: Readonly<{ action: Action; children: ReactNode }>) {
  if (action.disabled) {
    return <CardActionArea disabled sx={{ height: '100%' }}>{children}</CardActionArea>;
  }
  return (
    <CardActionArea component={RouterLink} to={action.to} sx={{ height: '100%' }}>
      {children}
    </CardActionArea>
  );
}

function QuickActionCard({ action }: Readonly<{ action: Action }>) {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 30%', minWidth: 150, borderRadius: '16px' }}>
      <ActionSurface action={action}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'primary.main' }}>
            {action.icon}
            <Typography variant="caption" sx={{ flex: 1, fontWeight: 700 }} noWrap>
              {action.label}
            </Typography>
            <ChevronRightIcon fontSize="small" color="action" />
          </Stack>
          {action.caption && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.35, color: 'text.secondary' }}>
              {action.caption}
            </Typography>
          )}
        </CardContent>
      </ActionSurface>
    </Card>
  );
}

interface Props {
  /** Only an approved venue can publish slots, so the calendar waits on it. */
  approved: boolean;
  pendingRequests: number;
}

/**
 * Venue Studio's quick actions: the availability calendar, the venue settings
 * and the slot-request queue with its pending count. Native twin (rule 27).
 */
export default function VenueQuickActions({ approved, pendingRequests }: Readonly<Props>) {
  const { t } = useTranslation();
  const availabilityCaption = approved
    ? undefined
    : t('mweb.venueManagePage.approvalNeededForAvailability');
  const actions: Action[] = [
    {
      key: 'availability',
      icon: <EventRepeatIcon fontSize="small" />,
      label: t('mweb.venueManagePage.availabilityAction'),
      caption: availabilityCaption,
      to: '/venues/availability',
      disabled: !approved,
    },
    {
      key: 'settings',
      icon: <SettingsIcon fontSize="small" />,
      label: t('mweb.venueManagePage.settingsAction'),
      to: '/venues/settings',
    },
    {
      key: 'slot-requests',
      icon: <EventAvailableIcon fontSize="small" />,
      label: t('mweb.venueManagePage.slotRequestsAction'),
      caption: t('mweb.venueManagePage.slotRequestsPending', { vars: { count: pendingRequests } }),
      to: '/venues/slot-requests',
    },
  ];

  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }} data-testid="venue-quick-actions">
      {actions.map((action) => (
        <QuickActionCard key={action.key} action={action} />
      ))}
    </Stack>
  );
}
