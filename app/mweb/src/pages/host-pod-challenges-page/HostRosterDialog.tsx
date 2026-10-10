import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { POD_ATTENDEE_SEATS, POD_PEOPLE } from '../pod-details-page/queries';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import { RosterForm, type AttendeeOption, type RosterValues } from './roster-form';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  open: boolean;
  podId: string;
  challenge: Pick<PodChallengeView, 'participant_mode' | 'competitors' | 'players' | 'judge_user_ids'>;
  actions: HostChallengeActions;
  onClose: () => void;
}

/** Confirmed attendees (the same booking records the server checks) with their names. */
function useAttendees(podId: string, open: boolean): AttendeeOption[] {
  const seats = useQuery<{ podAttendeeSeats: { user_id: string }[] }>(POD_ATTENDEE_SEATS, { variables: { id: podId }, skip: !open });
  const ids = useMemo(() => (seats.data?.podAttendeeSeats ?? []).map((s) => s.user_id), [seats.data]);
  const people = useQuery<{ publicUsersByIds: { user_id: string; full_name: string }[] }>(POD_PEOPLE, {
    variables: { ids },
    skip: !open || !ids.length,
  });
  return useMemo(
    () => (people.data?.publicUsersByIds ?? []).map((p) => ({ user_id: p.user_id, name: p.full_name })),
    [people.data]
  );
}

export default function HostRosterDialog({ open, podId, challenge, actions, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const attendees = useAttendees(podId, open);
  const values = useMemo<RosterValues>(
    () => ({
      competitors: challenge.competitors.map((c) => ({ competitor_id: c.competitor_id, name: c.name, user_id: c.user_id ?? '' })),
      players: challenge.players.map((p) => ({ player_id: p.player_id, name: p.name, team_id: p.team_id, user_id: p.user_id ?? '' })),
      judge_user_ids: challenge.judge_user_ids,
    }),
    [challenge]
  );

  const save = async (v: RosterValues) => {
    const ok = await actions.roster({
      competitors: v.competitors.map((c) => ({ competitor_id: c.competitor_id || null, name: c.name.trim(), user_id: c.user_id || null })),
      players: v.players.map((p) => ({ player_id: p.player_id || null, name: p.name.trim(), team_id: p.team_id, user_id: p.user_id || null })),
      judge_user_ids: v.judge_user_ids,
    });
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('mweb.challenge.rosterTitle')}</DialogTitle>
      <DialogContent dividers>
        <RosterForm
          values={values}
          teamMode={challenge.participant_mode === 'TEAM'}
          attendees={attendees}
          saving={actions.busy}
          onSubmit={save}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
