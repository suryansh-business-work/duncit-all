import { Avatar, Box, Stack, Typography } from '@mui/material';
import { readFollowStatus } from '@duncit/utils';
import FollowButton from '../FollowButton';

/** One row of `followersOf` / `followingOf` as the server returns it. */
export type Person = {
  user_id: string;
  username: string;
  full_name?: string | null;
  first_name?: string | null;
  profile_photo?: string | null;
  is_following: boolean;
  follow_status?: string | null;
  /** The other direction: this person follows the viewer, so the resting
   * button reads Follow Back. */
  follows_viewer?: boolean | null;
};

interface RowProps {
  person: Person;
  isSelf: boolean;
  onToggle: (p: Person) => void;
  onOpen: (id: string) => void;
}

/** Avatar, name, @handle and the three-state follow button; the identity
 * opens the profile. Twin of native FollowListScreen's FollowRow (rule 27). */
export default function FollowRow({ person, isSelf, onToggle, onOpen }: Readonly<RowProps>) {
  const name = person.full_name || person.first_name || 'Duncit user';
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        py: 1
      }}>
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
        <Typography noWrap sx={{
          fontWeight: 600
        }}>
          {name}
        </Typography>
        <Typography variant="caption" noWrap sx={{
          color: "text.secondary"
        }}>
          @{person.username}
        </Typography>
      </Box>
      {isSelf ? null : (
        <FollowButton
          status={readFollowStatus(person)}
          followsViewer={person.follows_viewer}
          onToggle={() => onToggle(person)}
        />
      )}
    </Stack>
  );
}
