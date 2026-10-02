import { Box, Chip, Typography } from '@mui/material';
import { scopes } from '../helpers';
import type { NotificationRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';

export type Translate = ReturnType<typeof useTranslation>['t'];

export type LocName = (id?: string | null) => string;

export const getNotificationRowId = (n: NotificationRow) => n.id;

export const scopeOptions = (t: Translate) => scopes(t).map((s) => ({ value: s.value, label: s.label }));

export const scopeLabel = (n: NotificationRow, locName: LocName, t: Translate) => {
  if (n.scope === 'LOCATION') return t('marketing.notifications.scopeLocation', { vars: { name: locName(n.location_id) } });
  if (n.scope === 'ZONE') return t('marketing.notifications.scopeZone', { vars: { name: locName(n.location_id), zone: n.zone_name ?? '' } });
  if (n.scope === 'USER') return t('marketing.notifications.scopeUsers', { vars: { count: n.target_user_ids?.length ?? 0 } });
  return scopes(t).find((s) => s.value === n.scope)?.label ?? n.scope;
};

export function ScopeChip({
  notification,
  locName,
}: Readonly<{ notification: NotificationRow; locName: LocName }>) {
  const { t } = useTranslation();
  const meta = scopes(t).find((s) => s.value === notification.scope);
  return (
    <Chip
      size="small"
      icon={meta?.icon}
      label={scopeLabel(notification, locName, t)}
      color={notification.scope === 'GLOBAL' ? 'primary' : 'default'}
      variant="outlined"
    />
  );
}

export const renderTitle = (n: NotificationRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{
      fontWeight: 600
    }}>
      {n.title}
    </Typography>
    {n.link_url && (
      <Typography
        variant="caption"
        component="div"
        sx={{
          color: "text.secondary",
          wordBreak: 'break-all'
        }}>
        → {n.link_url}
      </Typography>
    )}
  </Box>
);

export const renderBody = (n: NotificationRow) => (
  <Typography variant="caption" sx={{ maxWidth: 280, display: 'inline-block' }}>
    {n.body}
  </Typography>
);

export const renderDelivered = (n: NotificationRow) => (
  <Chip size="small" color="success" label={n.delivered_count} />
);

export const renderFailed = (n: NotificationRow) => (
  <Chip size="small" color={n.failed_count ? 'warning' : 'default'} label={n.failed_count} />
);
