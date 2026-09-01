import { Avatar, Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

interface Host {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface Props {
  hosts: Host[];
  /** Section heading. */
  title?: string;
}

/** A rail of the hosts linked to the club. */
export default function ClubHostsSection({ hosts, title }: Readonly<Props>) {
  const { t } = useTranslation();
  // Resolved here, not as parameter defaults: a default is evaluated before
  // any hook runs, so `t` would not exist yet.
  const titleText = title ?? t('mweb.clubDetails.hosts');
  const navigate = useNavigate();
  if (hosts.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{
        fontWeight: 700
      }}>
        {titleText}
      </Typography>
      <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        {hosts.map((host) => (
          <Stack
            key={host.id}
            spacing={0.5}
            role="button"
            aria-label={host.name}
            onClick={() => navigate(`/u/${host.id}`)}
            sx={{
              alignItems: "center",
              cursor: 'pointer',
              width: 72,
              flex: '0 0 auto'
            }}>
            <Avatar src={host.avatar_url || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              {host.name?.[0]?.toUpperCase() || 'H'}
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
