import { Avatar, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SettingsIcon from '@mui/icons-material/Settings';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography component="span" fontWeight={700}>
        {value}
      </Typography>{' '}
      <Typography component="span" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

interface Props {
  me: any;
  postsCount: number;
  onNewPost: () => void;
  onChangePhoto: () => void;
  onSettings: () => void;
}

export default function ProfileHeader({ me, postsCount, onNewPost, onChangePhoto, onSettings }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 2, sm: 4 }}
      alignItems="center"
      sx={{ px: { xs: 0, sm: 2 }, pt: 1 }}
    >
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={me.profile_photo || undefined}
          sx={{
            width: { xs: 88, sm: 150 },
            height: { xs: 88, sm: 150 },
            bgcolor: 'primary.main',
            fontSize: { xs: 36, sm: 56 },
          }}
        >
          {(me.first_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Tooltip title="Change profile image">
          <IconButton
            size="small"
            onClick={onChangePhoto}
            sx={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <PhotoCameraIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, width: '100%' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
          <Typography variant="h5" fontWeight={500}>
            {me.full_name || `${me.first_name} ${me.last_name}`}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" size="small" startIcon={<AddPhotoAlternateIcon />} onClick={onNewPost}>
              New Post
            </Button>
            <Tooltip title="Account settings">
              <IconButton size="small" onClick={onSettings}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={4} sx={{ mt: 2, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
          <Stat label="posts" value={postsCount} />
          <Stat label="followers" value={me.followers_count ?? 0} />
          <Stat label="following" value={me.following_count ?? 0} />
        </Stack>
        {me.bio && (
          <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {me.bio}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
