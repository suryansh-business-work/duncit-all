import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { CLUB_ADMIN_RECORD_IDS } from './queries';
import type { ClubActor } from './types';

interface RecordIdsData {
  clubAdminProfilesTable: { rows: { id: string; user_id: string }[] };
}

/**
 * Where each of a club's admins opens: their full Club Admin record, inside the
 * club — so Back returns here and Save lands back on the record.
 *
 * One read for every admin on the card, not one per name. Skipped when the club
 * has no admins: an empty `in` filter is dropped by the table engine and would
 * page through every Club Admin on the platform.
 */
export function useClubAdminPath(clubId: string, admins: ClubActor[]) {
  const userIds = admins.map((admin) => admin.id);
  const { data } = useQuery<RecordIdsData>(CLUB_ADMIN_RECORD_IDS, {
    variables: {
      query: {
        page_size: userIds.length,
        filters: [{ field: 'user_id', op: 'in', values: userIds }],
      },
    },
    skip: userIds.length === 0,
  });

  return useMemo(() => {
    const recordIdByUser = new Map(
      (data?.clubAdminProfilesTable.rows ?? []).map((row) => [row.user_id, row.id]),
    );
    return (admin: ClubActor) => {
      const recordId = recordIdByUser.get(admin.id);
      return recordId ? `/clubs/${clubId}/club-admins/${recordId}` : undefined;
    };
  }, [clubId, data]);
}
