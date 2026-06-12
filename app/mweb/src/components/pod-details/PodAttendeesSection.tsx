import { useMemo, useState } from 'react';
import { Avatar, AvatarGroup, ButtonBase, Stack, Typography } from '@mui/material';
import PodAttendeesDialog, { type AttendeePerson } from './PodAttendeesDialog';

interface Attendee {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
}

interface Props {
  attendees: Attendee[];
  attendeeIds: string[];
  hostIds: string[];
  totalSpots: number;
}

const MAX_PREVIEW = 8;

/** Builds the full attendee list — hosts first, each flagged for highlighting. */
export function buildAttendeePeople(
  attendees: Attendee[],
  attendeeIds: string[],
  hostIds: string[]
): AttendeePerson[] {
  const byId = new Map(attendees.map((a) => [a.user_id, a]));
  const hosts = new Set(hostIds);
  const people = (attendeeIds ?? []).map((id) => {
    const person = byId.get(id);
    return {
      user_id: id,
      full_name: person?.full_name ?? null,
      profile_photo: person?.profile_photo ?? null,
      is_host: hosts.has(id),
    };
  });
  return [...people.filter((p) => p.is_host), ...people.filter((p) => !p.is_host)];
}

/** Attendees — avatar group (hosts highlighted) that opens the full list dialog (3). */
export default function PodAttendeesSection({
  attendees,
  attendeeIds,
  hostIds,
  totalSpots,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const people = useMemo(
    () => buildAttendeePeople(attendees, attendeeIds, hostIds),
    [attendees, attendeeIds, hostIds]
  );
  const count = people.length;

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {totalSpots > 0
          ? `${count} of ${totalSpots} spots filled`
          : `${count} attendee${count === 1 ? '' : 's'} so far`}
      </Typography>
      {count === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Be the first to join!
        </Typography>
      ) : (
        <ButtonBase
          onClick={() => setOpen(true)}
          aria-label="View all attendees"
          sx={{ alignSelf: 'flex-start', borderRadius: 999, p: 0.5 }}
        >
          <AvatarGroup
            max={MAX_PREVIEW}
            sx={{
              '& .MuiAvatar-root': {
                width: 36,
                height: 36,
                fontSize: 13,
                bgcolor: 'primary.main',
                border: '2px solid',
                borderColor: 'background.paper',
              },
            }}
          >
            {people.map((person) => (
              <Avatar
                key={person.user_id}
                src={person.profile_photo || undefined}
                alt={person.full_name || 'Attendee'}
                sx={
                  person.is_host
                    ? { boxShadow: '0 0 0 2px rgba(255,79,115,0.85)', zIndex: 1 }
                    : undefined
                }
              >
                {(person.full_name?.[0] ?? '?').toUpperCase()}
              </Avatar>
            ))}
          </AvatarGroup>
          <Typography variant="caption" color="primary.main" sx={{ ml: 1, fontWeight: 800 }}>
            View all
          </Typography>
        </ButtonBase>
      )}
      <PodAttendeesDialog open={open} people={people} onClose={() => setOpen(false)} />
    </Stack>
  );
}
