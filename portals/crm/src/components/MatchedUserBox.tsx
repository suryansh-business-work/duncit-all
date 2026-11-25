import { Avatar, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { PlatformIcons } from '@duncit/ui';
import type { CrmMatchedUser } from '../api/crm.types';
import { EmailStatusBadge } from './email-status';

type Translate = ReturnType<typeof useTranslation>['t'];

const matchLabel = (m: CrmMatchedUser, t: Translate) =>
  t('crm.leadDetail.alsoDuncitUser', {
    vars: { via: m.matched_on === 'EMAIL' ? t('shell.common.email') : t('shell.common.phone') },
  });

/**
 * Small chip for the lead hero row when the lead is also a Duncit user, with
 * the platforms that account uses Duncit from beside it.
 */
export function MatchedUserChip({ matched }: Readonly<{ matched: CrmMatchedUser }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} component="span" sx={{ alignItems: 'center' }}>
      <Chip
        size="small"
        color="success"
        icon={<VerifiedUserIcon fontSize="small" />}
        label={matchLabel(matched, t)}
        variant="outlined"
      />
      <PlatformIcons platforms={matched.platforms_used} testId="matched-user-chip-platforms" />
    </Stack>
  );
}

/** Separate box surfacing the matched Duncit user's details on a lead. */
export default function MatchedUserBox({ matched }: Readonly<{ matched: CrmMatchedUser }>) {
  const { t } = useTranslation();
  // In the admin-configured zone, the same as Admin › Users.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  return (
    <Card variant="outlined" sx={{ borderColor: 'success.main' }} data-testid="matched-user-box">
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar alt="" src={matched.profile_photo || undefined} sx={{ bgcolor: 'success.main' }}>
            {(matched.full_name || 'U')[0]?.toUpperCase()}
          </Avatar>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <Typography component="p" variant="subtitle2" sx={{
                fontWeight: 800
              }}>{matched.full_name || t('crm.leadDetail.duncitUser')}</Typography>
              <MatchedUserChip matched={matched} />
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {[matched.email, matched.phone].filter(Boolean).join(' · ') || '—'}
              </Typography>
              <EmailStatusBadge email={matched.email} />
            </Stack>
            <Stack direction="row" spacing={3} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('crm.matchedUser.devices')}
                </Typography>
                <PlatformIcons platforms={matched.platforms_used} variant="all" testId="matched-user-box-platforms" />
              </Stack>
              <Typography variant="caption" data-testid="matched-user-last-activity">
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('crm.matchedUser.lastActivity')}:{' '}
                </Typography>
                {matched.last_activity_at
                  ? formatDateTime(matched.last_activity_at)
                  : t('crm.matchedUser.noActivity')}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
