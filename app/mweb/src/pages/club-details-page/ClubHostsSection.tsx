import { Avatar, Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Host {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface Props {
  hosts: Host[];
  /** Section heading — the same rail renders the club's hosts and its admins. */
  title?: string;
  /** Initial shown when a person has no avatar. */
  fallbackInitial?: string;
}

/** A rail of people linked to the club: its hosts, or its assigned admins. */
export default function ClubHostsSection({
  hosts,
  title = 'Hosts',
  fallbackInitial = 'H',
}: Readonly<Props>) {
  const navigate = useNavigate();
  if (hosts.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        {hosts.map((host) => (
          <Stack
            key={host.id}
            alignItems="center"
            spacing={0.5}
            role="button"
            aria-label={host.name}
            onClick={() => navigate(`/u/${host.id}`)}
            sx={{ cursor: 'pointer', width: 72, flex: '0 0 auto' }}
          >
            <Avatar src={host.avatar_url || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              {host.name?.[0]?.toUpperCase() || fallbackInitial}
            </Avatar>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }} noWrap>
              {host.name}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
