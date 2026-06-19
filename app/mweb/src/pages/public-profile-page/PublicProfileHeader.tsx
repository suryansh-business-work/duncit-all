import { useState } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import FollowListDialog from '../../components/FollowListDialog';

interface Props {
  user: {
    user_id: string;
    username?: string;
    full_name?: string;
    profile_photo?: string;
    bio?: string;
    city?: string;
    zone?: string;
    followers_count?: number;
    following_count?: number;
  };
  viewerId?: string;
}

function CountStat({
  value,
  label,
  onClick,
}: Readonly<{ value: number; label: string; onClick: () => void }>) {
  return (
    <Box onClick={onClick} role="button" sx={{ textAlign: 'center', cursor: 'pointer' }}>
      <Typography component="span" fontWeight={900}>
        {value}
      </Typography>{' '}
      <Typography component="span" variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export default function PublicProfileHeader({ user, viewerId }: Readonly<Props>) {
  const [followTab, setFollowTab] = useState<'followers' | 'following' | null>(null);

  return (
    <Stack alignItems="center" spacing={1.5}>
      <Avatar
        src={user.profile_photo || undefined}
        sx={{ width: 96, height: 96, fontSize: 36 }}
      >
        {user.full_name?.[0]?.toUpperCase() ?? '?'}
      </Avatar>
      <Typography variant="h5" fontWeight={700} textAlign="center">
        {user.full_name || 'Duncit user'}
      </Typography>
      {user.username && (
        <Typography variant="body2" color="text.secondary">
          @{user.username}
        </Typography>
      )}
      <Stack direction="row" spacing={3}>
        <CountStat
          value={user.followers_count ?? 0}
          label="followers"
          onClick={() => setFollowTab('followers')}
        />
        <CountStat
          value={user.following_count ?? 0}
          label="following"
          onClick={() => setFollowTab('following')}
        />
      </Stack>
      {(user.city || user.zone) && (
        <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
          <PlaceIcon fontSize="small" />
          <Typography variant="body2">
            {[user.zone, user.city].filter(Boolean).join(', ')}
          </Typography>
        </Stack>
      )}
      {user.bio && (
        <Box sx={{ px: 1, mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>
            {user.bio}
          </Typography>
        </Box>
      )}
      <FollowListDialog
        open={followTab !== null}
        onClose={() => setFollowTab(null)}
        userId={user.user_id}
        initialTab={followTab ?? 'followers'}
        viewerId={viewerId}
      />
    </Stack>
  );
}
