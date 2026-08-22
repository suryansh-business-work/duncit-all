import { useEffect } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { followActionFor, readFollowStatus } from '@duncit/utils';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import FollowButton from './FollowButton';
import ResponsiveDialog from './ResponsiveDialog';
import { CANCEL_FOLLOW_REQUEST, FOLLOW_USER, UNFOLLOW_USER } from '../pages/hosts-venues-page/queries';
import { useTranslation } from '../i18n/useTranslation';
import type { Translate } from '../i18n/fallback';

export const FOLLOW_LISTS = gql`
  query FollowLists($userId: ID!) {
    followersOf(user_id: $userId) {
      user_id
      username
      full_name
      first_name
      profile_photo
      is_following
      follow_status
    }
    followingOf(user_id: $userId) {
      user_id
      username
      full_name
      first_name
      profile_photo
      is_following
      follow_status
    }
  }
`;

type Tab = 'followers' | 'following';
const followTabs = (t: Translate): DuncitTabItem<Tab>[] => [
  { value: 'followers', label: t('mweb.followList.followers') },
  { value: 'following', label: t('mweb.nav.following') },
];
type Person = {
  user_id: string;
  username: string;
  full_name?: string | null;
  first_name?: string | null;
  profile_photo?: string | null;
  is_following: boolean;
  follow_status?: string | null;
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
        <Typography fontWeight={600} noWrap>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          @{person.username}
        </Typography>
      </Box>
      {isSelf ? null : (
        <FollowButton status={readFollowStatus(person)} onToggle={() => onToggle(person)} />
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Own key: this dialog opens over pages that have their own tab strip.
  const tabs = useTabParam<Tab>({
    items: followTabs(t),
    fallback: initialTab,
    param: 'selectedtab_connections',
  });
  const tab = tabs.value;
  const selectTab = tabs.onChange;
  // Which count was clicked decides the tab, so opening pins it in the URL —
  // otherwise a key left over from the last open would outrank the prop.
  useEffect(() => {
    if (open) selectTab(initialTab);
  }, [open, initialTab, selectTab]);

  const { data, loading, refetch } = useQuery(FOLLOW_LISTS, {
    variables: { userId },
    skip: !open || !userId,
    fetchPolicy: 'cache-and-network',
  });
  const [followUser] = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);
  const [cancelRequest] = useMutation(CANCEL_FOLLOW_REQUEST);

  const toggle = async (person: Person) => {
    const mutations = {
      FOLLOW: followUser,
      UNFOLLOW: unfollowUser,
      CANCEL_REQUEST: cancelRequest,
    };
    await mutations[followActionFor(readFollowStatus(person))]({
      variables: { user_id: person.user_id },
    });
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
    <ResponsiveDialog open={open} onClose={onClose} title={t('mweb.followList.connections')} sheetMaxHeight="80dvh">
      <DuncitTabs {...tabs} variant="fullWidth" sx={{ mb: 1 }} />
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
