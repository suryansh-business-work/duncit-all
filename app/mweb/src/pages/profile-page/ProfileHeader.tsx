import { useState } from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import FollowListDialog from '../../components/FollowListDialog';
import ProfileAvatar from '../../components/profile-avatar';
import { shareProfile } from '../../utils/share';

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
        borderRadius: 3,
        bgcolor: 'action.hover',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Typography display="block" fontWeight={950} lineHeight={1}>
        {new Intl.NumberFormat(undefined, { notation: value > 999 ? 'compact' : 'standard' }).format(value)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
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
  const displayName = me.full_name || `${me.first_name} ${me.last_name}`;
  const [followTab, setFollowTab] = useState<'followers' | 'following' | null>(null);

  return (
    <Box
      sx={{
        borderRadius: 4,
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
        <Tooltip title="Account settings">
          <IconButton onClick={onSettings} sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', bgcolor: 'rgba(0,0,0,0.32)' }}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Stack spacing={2} alignItems="center" sx={{ px: 2, pb: 2, mt: { xs: -6, sm: -7 } }}>
        <ProfileAvatar
          photo={me.profile_photo}
          name={displayName}
          size={128}
          onChanged={onChanged}
        />
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
            {displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }} noWrap>
            {me.email ?? `@${me.user_id}`}
          </Typography>
          {me.bio && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, whiteSpace: 'pre-wrap' }}>
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
          <Button fullWidth variant="contained" size="small" startIcon={<AddPhotoAlternateIcon />} onClick={onNewPost} sx={{ borderRadius: 3, fontWeight: 900, fontSize: 12, minHeight: 42, px: 1 }}>
            New Post
          </Button>
          <Button fullWidth variant="outlined" size="small" onClick={onSettings} sx={{ borderRadius: 3, fontWeight: 900, fontSize: 12, minHeight: 42, px: 1 }}>
            Edit profile
          </Button>
          <IconButton
            onClick={() => shareProfile(me.user_id, displayName)}
            sx={{
              width: 44,
              height: 42,
              flex: '0 0 44px',
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
            }}
            aria-label="Share profile"
          >
            <ShareIcon />
          </IconButton>
          <IconButton
            onClick={onSettings}
            sx={{
              width: 44,
              height: 42,
              flex: '0 0 44px',
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
            }}
            aria-label="Account settings"
          >
            <SettingsIcon />
          </IconButton>
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
