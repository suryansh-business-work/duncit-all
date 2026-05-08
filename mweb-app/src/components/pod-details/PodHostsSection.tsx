import { Avatar, Box, Stack, Typography } from '@mui/material';

interface Props {
  hosts: any[];
}

export default function PodHostsSection({ hosts }: Props) {
  if (!hosts || hosts.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hosts assigned.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5}>
      {hosts.map((h) => (
        <Stack key={h.id} direction="row" spacing={1.5} alignItems="center">
          <Avatar src={h.passport_photo_url || undefined} sx={{ width: 40, height: 40 }}>
            {h.full_name?.[0]?.toUpperCase() ?? 'H'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {h.full_name}
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
