import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Link, Stack, Typography } from '@mui/material';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SectionCard from './SectionCard';
import { POD_CLUB_DETAIL } from './queries';

interface Props {
  clubId: string | null;
}

interface ClubAdmin {
  id: string;
  name: string;
  avatar_url: string | null;
}

/** The pod's club and its club admins, each linking to the user's page. */
export default function PodClubCard({ clubId }: Readonly<Props>) {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(POD_CLUB_DETAIL, {
    variables: { id: clubId },
    skip: !clubId,
  });
  const club = data?.club;
  const admins: ClubAdmin[] = club?.club_admins ?? [];

  return (
    <SectionCard
      icon={<Diversity3Icon fontSize="small" />}
      title="Club & club admins"
      loading={loading && !club}
      error={error?.message}
      empty={!error && !loading && !club ? 'No club linked to this pod.' : null}
      action={
        club && (
          <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => navigate(`/clubs/${club.id}`)}>
            View club
          </Button>
        )
      }
    >
      {club && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" fontWeight={800}>
              {club.club_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              /{club.club_slug}
            </Typography>
          </Stack>
          {admins.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              This club has no club admins.
            </Typography>
          )}
          {admins.map((admin) => (
            <Stack key={admin.id} direction="row" spacing={1.5} alignItems="center">
              <Avatar src={admin.avatar_url ?? undefined} sx={{ width: 32, height: 32 }}>
                {(admin.name?.[0] ?? '?').toUpperCase()}
              </Avatar>
              <Link
                component="button"
                underline="hover"
                onClick={() => navigate(`/users/${admin.id}`)}
                sx={{ fontWeight: 700, textAlign: 'left' }}
              >
                {admin.name || 'Club admin'}
              </Link>
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
