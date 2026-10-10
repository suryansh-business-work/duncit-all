import { useEffect, useState } from 'react';

import { PodAttendeeSeatsDocument, PodPeopleDocument } from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';

export interface AttendeeName {
  user_id: string;
  name: string;
}

/**
 * A pod's confirmed attendees with their names — the same booking records the
 * server checks when a competitor is linked to an attendee. Loaded only while
 * `enabled` (a sheet that is open); a failed read leaves the list empty and
 * reports why, so the roster can still be edited by name.
 */
export function usePodAttendeeNames(podId: string, enabled: boolean) {
  const [attendees, setAttendees] = useState<AttendeeName[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !podId) return undefined;
    let active = true;
    const load = async () => {
      const seats = await graphqlRequest(PodAttendeeSeatsDocument, { podId }, { auth: true });
      const ids = seats.podAttendeeSeats.map((s) => s.user_id);
      if (!ids.length) return [];
      const people = await graphqlRequest(PodPeopleDocument, { ids }, { auth: true });
      // A profile without a name cannot be told apart in a list of names.
      return people.publicUsersByIds.flatMap((p) =>
        p.full_name ? [{ user_id: p.user_id, name: p.full_name }] : [],
      );
    };
    load()
      .then((list) => {
        if (!active) return;
        setAttendees(list);
        setError('');
      })
      .catch((e: unknown) => active && setError((e as Error).message));
    return () => {
      active = false;
    };
  }, [podId, enabled]);

  return { attendees, error };
}
