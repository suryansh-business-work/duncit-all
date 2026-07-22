import { Avatar, Badge, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

interface ChatPerson {
  user_id: string;
  full_name: string;
  profile_photo?: string | null;
}

interface Props {
  hosts: ChatPerson[];
  participants: ChatPerson[];
  count: number;
  onOpenProfile: (userId: string) => void;
}

/** The chat-detail people panel: host(s) with a badge, participants and a live
 * participant count. Tapping anyone opens their public profile. Web twin of the
 * mobile ChatParticipantsPanel. */
export default function ChatParticipants({ hosts, participants, count, onOpenProfile }: Readonly<Props>) {
  if (hosts.length === 0 && participants.length === 0) return null;

  const personChip = (person: ChatPerson, isHost: boolean) => {
    const avatar = (
      <Avatar src={person.profile_photo || undefined} sx={{ width: 34, height: 34 }}>
        {(person.full_name?.[0] ?? 'U').toUpperCase()}
      </Avatar>
    );
    return (
      <Tooltip key={person.user_id} title={`${person.full_name}${isHost ? ' · Host' : ''}`}>
        <Chip
          data-testid={`chat-person-${person.user_id}`}
          onClick={() => onOpenProfile(person.user_id)}
          clickable
          avatar={
            isHost ? (
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={<StarIcon sx={{ fontSize: 12, color: 'warning.main' }} />}
              >
                {avatar}
              </Badge>
            ) : (
              avatar
            )
          }
          label={person.full_name}
          variant="outlined"
          sx={{ height: 42, borderRadius: 999, fontWeight: 800 }}
        />
      </Tooltip>
    );
  };

  return (
    <Box
      data-testid="chat-participants"
      sx={{ px: { xs: 1.25, sm: 2 }, py: 1, borderBottom: 1, borderColor: 'divider' }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
        {count} {count === 1 ? 'participant' : 'participants'}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 0.75, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {hosts.map((host) => personChip(host, true))}
        {participants.map((person) => personChip(person, false))}
      </Stack>
    </Box>
  );
}
