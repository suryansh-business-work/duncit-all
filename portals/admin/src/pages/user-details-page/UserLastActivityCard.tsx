import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { PlatformIcons } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** ISO time of the account's last signed-in request, or null when none was seen. */
  lastActivityAt?: string | null;
  platforms?: readonly string[] | null;
}

/**
 * The top of the Activity tab: when the account last used Duncit and from
 * which platforms. The time reads in the Admin Panel's configured zone, the
 * same as the summary card and the Users table.
 */
export default function UserLastActivityCard({ lastActivityAt, platforms }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  return (
    <Card data-testid="admin-user-last-activity-card">
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 4 }}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Stack spacing={0.25}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('admin.users.colLastActivity')}
            </Typography>
            <Typography variant="subtitle1" data-testid="admin-user-last-activity-at">
              {lastActivityAt ? formatDateTime(lastActivityAt) : t('admin.users.noActivity')}
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('admin.users.colPlatforms')}
            </Typography>
            <PlatformIcons platforms={platforms} variant="all" testId="admin-user-activity-platforms" />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
