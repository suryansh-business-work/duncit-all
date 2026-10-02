import { Avatar, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import type { useTranslation } from '@duncit/shell';
import type { ClubRow } from '../queries';

/** The translator every cell in this file is handed. */
type Translate = ReturnType<typeof useTranslation>['t'];

export const renderCover = (c: ClubRow) => (
  <Avatar
    variant="rounded"
    alt=""
    src={c.club_feature_images_and_videos?.[0]?.url}
    sx={{ width: 32, height: 32 }}
  >
    {c.club_name[0]}
  </Avatar>
);

/** A club with nobody to run it. See ClubRow.admin_user_ids. */
export const hasNoClubAdmin = (c: ClubRow): boolean => (c.admin_user_ids?.length ?? 0) === 0;

/**
 * The club, in red when it has no admin.
 *
 * Not a separate column: an admin scanning this list is looking for a club by
 * NAME, and a missing owner belongs on the thing it is missing from. The
 * tooltip says what to do about it rather than only that something is wrong.
 */
export function ClubNameCell({ club, t }: Readonly<{ club: ClubRow; t: Translate }>) {
  const orphaned = hasNoClubAdmin(club);
  const body = (
    <Box sx={{ lineHeight: 1.2 }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        {orphaned && <ErrorOutlineIcon fontSize="small" color="error" />}
        <Typography
          variant="body2"
          component="div"
          sx={{ fontWeight: 600, color: orphaned ? 'error.main' : undefined }}
        >
          {club.club_name}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        component="div"
        sx={{ color: orphaned ? 'error.main' : 'text.secondary' }}
      >
        {orphaned ? t('admin.clubs.noAdminHint') : club.club_id}
      </Typography>
    </Box>
  );
  if (!orphaned) return body;
  return <Tooltip title={t('admin.clubs.noAdminTooltip')}>{body}</Tooltip>;
}

/** The club-name column's renderer, bound to the page's translator. */
export function clubNameRenderer(t: Translate) {
  return function renderClubName(c: ClubRow) {
    return <ClubNameCell club={c} t={t} />;
  };
}

export const renderWhatsApp = (c: ClubRow) => (
  <Stack direction="row" spacing={0.5} component="span">
    {c.club_whats_app_community_link && <Chip size="small" label="C" />}
    {c.club_whats_app_group_link && <Chip size="small" label="G" />}
  </Stack>
);

export const whatsAppValue = (c: ClubRow) =>
  [c.club_whats_app_community_link ? 'C' : '', c.club_whats_app_group_link ? 'G' : '']
    .filter(Boolean)
    .join(' ');
