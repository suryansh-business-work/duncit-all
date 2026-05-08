import { Avatar, Box, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';

interface Props {
  user: {
    full_name?: string;
    profile_photo?: string;
    bio?: string;
    city?: string;
    zone?: string;
  };
}

export default function PublicProfileHeader({ user }: Props) {
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
    </Stack>
  );
}
