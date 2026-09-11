import { useState } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import FollowListDialog from '../../components/FollowListDialog';
import { SURFACE_SX } from '../../theme';

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
    <Box onClick={onClick} role="button" sx={{ flex: 1, textAlign: 'center', py: 1.5, cursor: 'pointer' }}>
      <Typography sx={{ display: 'block', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function PublicProfileHeader({ user, viewerId }: Readonly<Props>) {
  const [followTab, setFollowTab] = useState<'followers' | 'following' | null>(null);

  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar
        src={user.profile_photo || undefined}
        sx={{ width: 88, height: 88, fontSize: 34, fontWeight: 600, bgcolor: 'primary.main' }}
      >
        {user.full_name?.[0]?.toUpperCase() ?? '?'}
      </Avatar>
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
          {user.full_name || 'Duncit user'}
        </Typography>
        {user.username && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5 }}>
            @{user.username}
          </Typography>
        )}
        {(user.city || user.zone) && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: 'center', justifyContent: 'center', color: 'text.secondary', mt: 0.5 }}
          >
            <PlaceIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">{[user.zone, user.city].filter(Boolean).join(', ')}</Typography>
          </Stack>
        )}
        {user.bio && (
          <Typography variant="body2" sx={{ mt: 1, px: 1, whiteSpace: 'pre-wrap' }}>
            {user.bio}
          </Typography>
        )}
      </Box>
      <Stack
        direction="row"
        sx={{ ...SURFACE_SX, width: '100%', '& > * + *': { borderLeft: 1, borderColor: 'divider' } }}
      >
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
