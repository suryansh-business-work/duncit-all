import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ResponsiveDialog from '../../components/ResponsiveDialog';

export const CLUB_FOLLOWERS = gql`
  query ClubFollowers($clubId: ID!) {
    clubFollowers(club_doc_id: $clubId) {
      user_id
      username
      full_name
      first_name
      profile_photo
    }
  }
`;

interface Person {
  user_id: string;
  username: string;
  full_name?: string | null;
  first_name?: string | null;
  profile_photo?: string | null;
}

interface Props {
  open: boolean;
  clubId: string;
  onClose: () => void;
}

/** The people behind the club's Total Members count. The count was previously a
 * dead number — you could see how many, never who. Twin of native's
 * <ClubFollowersSheet/> (rule 27). */
export default function ClubFollowersDialog({ open, clubId, onClose }: Readonly<Props>) {
  const navigate = useNavigate();
  const { data, loading } = useQuery(CLUB_FOLLOWERS, {
    variables: { clubId },
    skip: !open || !clubId,
    fetchPolicy: 'cache-and-network',
  });
  const people: Person[] = data?.clubFollowers ?? [];

  const openProfile = (id: string) => {
    onClose();
    navigate(`/u/${id}`);
  };

  let body;
  if (loading && people.length === 0) {
    body = (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  } else if (people.length === 0) {
    body = (
      <Typography color="text.secondary" textAlign="center" sx={{ py: 4, fontWeight: 700 }}>
        No members yet.
      </Typography>
    );
  } else {
    body = (
      <Box>
        {people.map((person) => {
          const name = person.full_name || person.first_name || 'Duncit user';
          return (
            <Stack
              key={person.user_id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              role="button"
              tabIndex={0}
              aria-label={name}
              onClick={() => openProfile(person.user_id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openProfile(person.user_id);
                }
              }}
              sx={{ py: 1, cursor: 'pointer' }}
            >
              <Avatar src={person.profile_photo || undefined}>{name[0]?.toUpperCase()}</Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={600} noWrap>
                  {name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  @{person.username}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Box>
    );
  }

  return (
    <ResponsiveDialog open={open} onClose={onClose} title="Total Members">
      {body}
    </ResponsiveDialog>
  );
}
