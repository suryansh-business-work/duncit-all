import { useMemo, useState } from 'react';
import { Avatar, AvatarGroup, ButtonBase, Stack, Typography } from '@mui/material';
import PodAttendeesDialog, { type AttendeePerson, type SpotFillRow } from './PodAttendeesDialog';
import { useTranslation } from '../../i18n/useTranslation';

interface Attendee {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
}

/** One filled Backout seat as the server reports it (podSpotFills). */
export interface SpotFill {
  backout_no: string;
  backed_out_user_id: string;
  backed_out_user_name?: string | null;
  backed_out_profile_photo?: string | null;
  replacement_user_id?: string | null;
  replacement_user_name?: string | null;
}

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** Resolve the raw spot fills to display rows ONCE — the caption line and the
 * dialog both render these, so the fallback copy can't drift between them. */
export function buildSpotFillRows(fills: SpotFill[], t: Translate): SpotFillRow[] {
  return (fills ?? []).map((fill) => ({
    key: fill.backout_no,
    old_user_id: fill.backed_out_user_id,
    old_name: fill.backed_out_user_name || t('mweb.podDetails.formerAttendee'),
    old_photo: fill.backed_out_profile_photo ?? null,
    filled_by_label: t('mweb.podDetails.spotFilledBy', {
      vars: { name: fill.replacement_user_name || t('mweb.podDetails.newAttendee') },
    }),
  }));
}

interface Props {
  attendees: Attendee[];
  attendeeIds: string[];
  hostIds: string[];
  totalSpots: number;
  /** Past pods show "attended" instead of "going". */
  expired?: boolean;
  /** Filled Backout seats — old attendee struck through, filler named. */
  spotFills?: SpotFill[];
  /**
   * Seats each person's booking holds, from `podAttendeeSeats`. Absent means
   * one each, which is what every booking was before multi-seat.
   */
  seatsByUser?: Record<string, number>;
  /** Occupancy from the server (people + the seats they bought beyond their own). */
  seatsTaken?: number;
}

const MAX_PREVIEW = 8;

/** Builds the full attendee list — hosts first, each flagged for highlighting. */
export function buildAttendeePeople(
  attendees: Attendee[],
  attendeeIds: string[],
  hostIds: string[],
  seatsByUser: Record<string, number> = {}
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
      seats: seatsByUser[id] ?? 1,
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
  expired,
  spotFills = [],
  seatsByUser,
  seatsTaken,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const people = useMemo(
    () => buildAttendeePeople(attendees, attendeeIds, hostIds, seatsByUser),
    [attendees, attendeeIds, hostIds, seatsByUser]
  );
  const fillRows = useMemo(() => buildSpotFillRows(spotFills, t), [spotFills, t]);
  // Seats, not faces: one person can be bringing three more, and the number
  // beside "of N spots" has to mean the same thing the capacity does.
  const count = seatsTaken ?? people.reduce((sum, person) => sum + (person.seats ?? 1), 0);
  const noun = expired ? 'attended' : 'going';

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {totalSpots > 0 ? `${count} / ${totalSpots} ${noun}` : `${count} ${noun}`}
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
          <Typography variant="caption" color="primary.main" sx={{ ml: 1, fontWeight: 600 }}>
            View all
          </Typography>
        </ButtonBase>
      )}
      {fillRows.length > 0 && (
        <Stack spacing={0.25}>
          {fillRows.map((fill) => (
            <Typography key={fill.key} variant="caption" color="text.secondary">
              <Typography
                component="span"
                variant="caption"
                sx={{ textDecoration: 'line-through', color: 'text.disabled' }}
              >
                {fill.old_name}
              </Typography>
              {' · '}
              {fill.filled_by_label}
            </Typography>
          ))}
        </Stack>
      )}
      <PodAttendeesDialog
        open={open}
        people={people}
        spotFills={fillRows}
        onClose={() => setOpen(false)}
      />
    </Stack>
  );
}
