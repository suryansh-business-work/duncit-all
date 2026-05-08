import { Avatar, Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Host {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
  passport_photo_url?: string | null;
}

interface Props {
  hosts: Host[];
}

export default function PodHostsSection({ hosts }: Props) {
  const navigate = useNavigate();
  if (!hosts || hosts.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hosts assigned.
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {hosts.map((h) => (
        <Stack
          key={h.user_id}
          direction="row"
          spacing={1.5}
          alignItems="center"
          onClick={() => navigate(`/u/${h.user_id}`)}
          sx={{
            cursor: 'pointer',
            p: 0.75,
            borderRadius: 1,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            src={h.profile_photo || h.passport_photo_url || undefined}
            sx={{ width: 40, height: 40 }}
          >
            {h.full_name?.[0]?.toUpperCase() ?? 'H'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {h.full_name || 'Host'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Host
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
