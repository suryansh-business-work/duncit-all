import { Avatar, Box, ButtonBase, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface ProfileIdentityProps {
  me: {
    profile_photo?: string | null;
    first_name?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  onClick: () => void;
}

/** Centered avatar + name that opens the social profile. */
export default function ProfileIdentity({ me, onClick }: Readonly<ProfileIdentityProps>) {
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();
  return (
    <Box sx={{ px: 2.5, pt: 1, pb: 2, textAlign: 'center' }}>
      <ButtonBase
        onClick={onClick}
        sx={{ borderRadius: 4, p: 1, flexDirection: 'column', gap: 1 }}
        aria-label="Open your profile"
      >
        <Avatar
          src={me?.profile_photo || undefined}
          sx={{
            width: 76,
            height: 76,
            bgcolor: 'primary.main',
            fontSize: 28,
            fontWeight: 800,
            boxShadow: '0 0 0 3px rgba(255,79,115,0.18)',
          }}
        >
          {initial}
        </Avatar>
        <Stack direction="row" alignItems="center" spacing={0.25}>
          <Typography variant="h6" fontWeight={800} noWrap sx={{ maxWidth: 240 }}>
            {me?.full_name ?? 'User'}
          </Typography>
          <ChevronRightIcon fontSize="small" color="disabled" />
        </Stack>
        {me?.email && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 260 }}>
            {me.email}
          </Typography>
        )}
      </ButtonBase>
    </Box>
  );
}
