import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { POD_CLUB_DETAIL } from './queries';

interface Props {
  clubId: string | null;
}

/** The pod's club and its club admins, each linking to the user's page. */
export default function PodClubCard({ clubId }: Readonly<Props>) {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(POD_CLUB_DETAIL, {
    variables: { id: clubId },
    skip: !clubId,
  });
  const club = data?.club;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Diversity3Icon color="primary" />
            <Typography variant="subtitle1" fontWeight={900}>
              Club & club admins
            </Typography>
          </Stack>
          {club && (
            <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => navigate(`/clubs/${club.id}`)}>
              View club
            </Button>
          )}
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        {error && <Alert severity="error">{error.message}</Alert>}
        {!error && loading && !club && <CircularProgress size={20} />}
        {!error && !loading && !club && (
          <Typography variant="body2" color="text.secondary">
            No club linked to this pod.
          </Typography>
        )}
        {club && (
          <Stack spacing={1.5}>
            <Typography variant="body2" fontWeight={800}>
              {club.club_name}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                /{club.club_slug}
              </Typography>
            </Typography>
            {(club.club_admins ?? []).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                This club has no club admins.
              </Typography>
            )}
            {(club.club_admins ?? []).map((admin: { id: string; name: string; avatar_url: string | null }) => (
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
      </CardContent>
    </Card>
  );
}
