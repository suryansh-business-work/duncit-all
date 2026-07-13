import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ResponsiveDialog from './ResponsiveDialog';
import { FOLLOW_USER, UNFOLLOW_USER } from '../pages/hosts-venues-page/queries';

export const FOLLOW_LISTS = gql`
  query FollowLists($userId: ID!) {
    followersOf(user_id: $userId) {
      user_id
      username
      full_name
      first_name
      profile_photo
      is_following
    }
    followingOf(user_id: $userId) {
      user_id
      username
      full_name
      first_name
      profile_photo
      is_following
    }
  }
`;

type Tab = 'followers' | 'following';
type Person = {
  user_id: string;
  username: string;
  full_name?: string | null;
  first_name?: string | null;
  profile_photo?: string | null;
  is_following: boolean;
};

interface RowProps {
  person: Person;
  isSelf: boolean;
  onToggle: (p: Person) => void;
  onOpen: (id: string) => void;
}

function FollowRow({ person, isSelf, onToggle, onOpen }: Readonly<RowProps>) {
  const name = person.full_name || person.first_name || 'Duncit user';
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
      <Avatar
        src={person.profile_photo || undefined}
        onClick={() => onOpen(person.user_id)}
        sx={{ cursor: 'pointer' }}
      >
        {name[0]?.toUpperCase()}
      </Avatar>
      <Box
        onClick={() => onOpen(person.user_id)}
        sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
      >
        <Typography fontWeight={800} noWrap>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          @{person.username}
        </Typography>
      </Box>
      {isSelf ? null : (
        <Button
          size="small"
          variant={person.is_following ? 'outlined' : 'contained'}
          onClick={() => onToggle(person)}
          sx={{ fontWeight: 800, borderRadius: 999 }}
        >
          {person.is_following ? 'Following' : 'Follow'}
        </Button>
      )}
    </Stack>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialTab: Tab;
  viewerId?: string;
}

/** Followers / Following list dialog (bug 9) — opened from the profile counts.
 * Lists each person's avatar, name, @handle + a follow toggle; rows open /u/:id. */
export default function FollowListDialog({ open, onClose, userId, initialTab, viewerId }: Readonly<Props>) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const { data, loading, refetch } = useQuery(FOLLOW_LISTS, {
    variables: { userId },
    skip: !open || !userId,
    fetchPolicy: 'cache-and-network',
  });
  const [followUser] = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);

  const toggle = async (person: Person) => {
    const mutation = person.is_following ? unfollowUser : followUser;
    await mutation({ variables: { user_id: person.user_id } });
    await refetch();
  };

  const people: Person[] = (tab === 'followers' ? data?.followersOf : data?.followingOf) ?? [];
  const openProfile = (id: string) => {
    onClose();
    navigate(`/u/${id}`);
  };

  const emptyOrList = people.length === 0 ? (
    <Typography color="text.secondary" textAlign="center" sx={{ py: 4, fontWeight: 700 }}>
      {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
    </Typography>
  ) : (
    <Box>
      {people.map((person) => (
        <FollowRow
          key={person.user_id}
          person={person}
          isSelf={person.user_id === viewerId}
          onToggle={toggle}
          onOpen={openProfile}
        />
      ))}
    </Box>
  );

  return (
    <ResponsiveDialog open={open} onClose={onClose} title="Connections" sheetMaxHeight="80dvh">
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth" sx={{ mb: 1 }}>
        <Tab value="followers" label="Followers" />
        <Tab value="following" label="Following" />
      </Tabs>
      {loading && people.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : (
        emptyOrList
      )}
    </ResponsiveDialog>
  );
}
