import { Avatar, Box, ButtonBase, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface UserSummaryProps {
  me: any;
  onClick: () => void;
}

/** Avatar + name + email card that opens the profile. Roles intentionally do
 * not appear here — the studio switcher communicates the active role. */
export default function UserSummary({ me, onClick }: Readonly<UserSummaryProps>) {
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Stack
        component={ButtonBase}
        onClick={onClick}
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          textAlign: 'left',
          p: 1.5,
          borderRadius: 3.5,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
          transition: 'border-color 160ms ease',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        <Avatar
          src={me?.profile_photo || undefined}
          sx={{
            width: 56,
            height: 56,
            bgcolor: 'primary.main',
            fontSize: 20,
            boxShadow: '0 0 0 3px rgba(255,79,115,0.18)',
          }}
        >
          {(me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
          }}
        >
          <Typography variant="subtitle1" fontWeight={800} noWrap>
            {me?.full_name ?? 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {me?.email ?? '—'}
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 800 }}>
            View profile
          </Typography>
        </Box>
        <ChevronRightIcon fontSize="small" color="disabled" />
      </Stack>
    </Box>
  );
}
