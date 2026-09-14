import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import VerifiedIcon from '@mui/icons-material/Verified';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import FollowListDialog from '../../components/FollowListDialog';
import ProfileAvatar from '../../components/profile-avatar';
import ProfileHandleLink from './ProfileHandleLink';
import { SURFACE_SX } from '../../theme';
import { shareProfile } from '../../utils/share';
import { useTranslation } from '../../i18n/useTranslation';

/** A 44px round soft button — share / settings beside the pill actions. */
const ROUND_SX = { width: 44, height: 44, flex: '0 0 44px', bgcolor: 'action.hover' } as const;
const PILL_SX = { flex: 1, minHeight: 44, px: 1.5 } as const;

function Stat({
  label,
  value,
  onClick,
  testId,
}: Readonly<{ label: string; value: number; onClick?: () => void; testId: string }>) {
  return (
    <Box
      data-testid={testId}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      sx={{ flex: 1, textAlign: 'center', py: 1.5, cursor: onClick ? 'pointer' : 'default' }}
    >
      <Typography sx={{ display: 'block', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
        {new Intl.NumberFormat(undefined, { notation: value > 999 ? 'compact' : 'standard' }).format(value)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );
}

interface Props {
  me: any;
  postsCount: number;
  onNewPost: () => void;
  onSettings: () => void;
  /** Refresh the page after the avatar photo/story changes. */
  onChanged?: () => void;
}

export default function ProfileHeader({ me, postsCount, onNewPost, onSettings, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const displayName = me.full_name || `${me.first_name} ${me.last_name}`;
  const [followTab, setFollowTab] = useState<'followers' | 'following' | null>(null);

  return (
    <Stack data-testid="profile-header" spacing={2} sx={{ alignItems: 'center', pt: 1 }}>
      <ProfileAvatar photo={me.profile_photo} name={displayName} size={88} onChanged={onChanged} />
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        {/* The tick beside the NAME is the only thing that says the email is
            verified. Native shows the same mark in the same place (rule 27). */}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <Typography data-testid="profile-header-name" component="h1" sx={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
            {displayName}
          </Typography>
          {me.is_email_verified && (
            <VerifiedIcon color="primary" sx={{ fontSize: 20 }} titleAccess="Email verified" />
          )}
        </Stack>
        {/* The handle is also the share link — tapping it copies `/u/<handle>`. */}
        <ProfileHandleLink username={me.username ?? null} fallback={me.email ?? `@${me.user_id}`} />
        {me.bio && (
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
            {me.bio}
          </Typography>
        )}
      </Box>
      <Stack
        direction="row"
        sx={{
          ...SURFACE_SX,
          width: '100%',
          '& > * + *': { borderLeft: 1, borderColor: 'divider' },
        }}
      >
        <Stat testId="profile-header-stat-posts" label="posts" value={postsCount} />
        <Stat
          testId="profile-header-stat-followers"
          label="followers"
          value={me.followers_count ?? 0}
          onClick={() => setFollowTab('followers')}
        />
        <Stat
          testId="profile-header-stat-following"
          label="following"
          value={me.following_count ?? 0}
          onClick={() => setFollowTab('following')}
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
        <DuncitButton
          data-testid="profile-header-new-post"
          variant="contained"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={onNewPost}
          sx={PILL_SX}
        >
          New Post
        </DuncitButton>
        <DuncitButton
          data-testid="profile-header-edit"
          color="inherit"
          onClick={onSettings}
          sx={{ ...PILL_SX, bgcolor: 'action.hover' }}
        >
          Edit profile
        </DuncitButton>
        <DuncitIconButton
          data-testid="profile-header-share"
          onClick={() => shareProfile(me.user_id, displayName, me.username)}
          sx={ROUND_SX}
          aria-label={t('mweb.common.shareProfile')}
        >
          <ShareIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton
          data-testid="profile-header-settings"
          onClick={onSettings}
          sx={ROUND_SX}
          aria-label={t('mweb.profile.accountSettings')}
        >
          <SettingsIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <FollowListDialog
        open={followTab !== null}
        onClose={() => setFollowTab(null)}
        userId={me.user_id}
        initialTab={followTab ?? 'followers'}
        viewerId={me.user_id}
      />
    </Stack>
  );
}
