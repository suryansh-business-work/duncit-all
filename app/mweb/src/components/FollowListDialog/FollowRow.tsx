import { Avatar, Box, ButtonBase, Stack, Typography } from '@mui/material';
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
      data-testid={`follow-row-${person.user_id}`}
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        py: 1.25
      }}>
      {/* Avatar and name are ONE keyboard-reachable control that opens the
          profile (2.1.1) — the native twin's follow-open row. */}
      <ButtonBase
        data-testid={`follow-open-${person.user_id}`}
        onClick={() => onOpen(person.user_id)}
        sx={{ flex: 1, minWidth: 0, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left', borderRadius: '12px' }}
      >
        <Avatar
          data-testid={`follow-row-avatar-${person.user_id}`}
          alt=""
          src={person.profile_photo || undefined}
          sx={{ width: 44, height: 44, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600 }}
        >
          {name[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography data-testid={`follow-row-name-${person.user_id}`} noWrap sx={{
            fontSize: 15,
            fontWeight: 600
          }}>
            {name}
          </Typography>
          <Typography data-testid={`follow-row-handle-${person.user_id}`} variant="caption" noWrap sx={{
            display: 'block',
            fontSize: 13,
            color: "text.secondary"
          }}>
            @{person.username}
          </Typography>
        </Box>
      </ButtonBase>
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
