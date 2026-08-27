import { useState } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import VerifiedIcon from '@mui/icons-material/Verified';
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import FollowListDialog from '../../components/FollowListDialog';
import ProfileAvatar from '../../components/profile-avatar';
import ProfileHandleLink from './ProfileHandleLink';
import { shareProfile } from '../../utils/share';
import { useTranslation } from '../../i18n/useTranslation';

function Stat({
  label,
  value,
  onClick,
}: Readonly<{ label: string; value: number; onClick?: () => void }>) {
  return (
    <Box
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      sx={{
        flex: 1,
        textAlign: 'center',
        p: 1,
        borderRadius: '16px',
        bgcolor: 'action.hover',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Typography
        sx={{
          display: "block",
          fontWeight: 700,
          lineHeight: 1
        }}>
        {new Intl.NumberFormat(undefined, { notation: value > 999 ? 'compact' : 'standard' }).format(value)}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 600
        }}>
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
    <Box
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 20px 48px rgba(9,7,18,0.20)',
      }}
    >
      <Box
        sx={{
          height: { xs: 116, sm: 150 },
          background: 'linear-gradient(135deg, #ff8b5f 0%, #ed4f7a 42%, #35158a 100%)',
          position: 'relative',
        }}
      >
        <Tooltip title={t('mweb.profile.accountSettings')}>
          <DuncitIconButton onClick={onSettings} sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', bgcolor: 'rgba(0,0,0,0.32)' }}>
            <SettingsIcon />
          </DuncitIconButton>
        </Tooltip>
      </Box>
      <Stack
        spacing={2}
        sx={{
          alignItems: "center",
          px: 2,
          pb: 2,
          mt: { xs: -6, sm: -7 }
        }}>
        <ProfileAvatar
          photo={me.profile_photo}
          name={displayName}
          size={128}
          onChanged={onChanged}
        />
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          {/* The tick beside the NAME is now the only thing that says the email
              is verified — the "Your email is verified." band below is gone.
              Native shows the same mark in the same place (rule 27). */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: "center",
              justifyContent: "center"
            }}>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              {displayName}
            </Typography>
            {me.is_email_verified && (
              <VerifiedIcon color="primary" sx={{ fontSize: 20 }} titleAccess="Email verified" />
            )}
          </Stack>
          {/* The handle is also the share link — tapping it copies
              `/u/<handle>`, which is why it lives here and not in
              settings (native shows the same, rule 27). */}
          <ProfileHandleLink
            username={me.username ?? null}
            fallback={me.email ?? `@${me.user_id}`}
          />
          {me.bio && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mt: 1.25,
                whiteSpace: 'pre-wrap'
              }}>
              {me.bio}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <Stat label="posts" value={postsCount} />
          <Stat
            label="followers"
            value={me.followers_count ?? 0}
            onClick={() => setFollowTab('followers')}
          />
          <Stat
            label="following"
            value={me.following_count ?? 0}
            onClick={() => setFollowTab('following')}
          />
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ width: '100%' }}>
          <DuncitButton fullWidth variant="contained" size="small" startIcon={<AddPhotoAlternateIcon />} onClick={onNewPost} sx={{ borderRadius: 999, fontWeight: 700, fontSize: 12, minHeight: 42, px: 1 }}>
            New Post
          </DuncitButton>
          <DuncitButton fullWidth variant="outlined" size="small" onClick={onSettings} sx={{ borderRadius: 999, fontWeight: 700, fontSize: 12, minHeight: 42, px: 1 }}>
            Edit profile
          </DuncitButton>
          <DuncitIconButton
            onClick={() => shareProfile(me.user_id, displayName, me.username)}
            sx={{
              width: 44,
              height: 42,
              flex: '0 0 44px',
              borderRadius: '50%',
              border: 1,
              borderColor: 'divider',
            }}
            aria-label={t('mweb.common.shareProfile')}
          >
            <ShareIcon />
          </DuncitIconButton>
          <DuncitIconButton
            onClick={onSettings}
            sx={{
              width: 44,
              height: 42,
              flex: '0 0 44px',
              borderRadius: '50%',
              border: 1,
              borderColor: 'divider',
            }}
            aria-label={t('mweb.profile.accountSettings')}
          >
            <SettingsIcon />
          </DuncitIconButton>
        </Stack>
      </Stack>
      <FollowListDialog
        open={followTab !== null}
        onClose={() => setFollowTab(null)}
        userId={me.user_id}
        initialTab={followTab ?? 'followers'}
        viewerId={me.user_id}
      />
    </Box>
  );
}
