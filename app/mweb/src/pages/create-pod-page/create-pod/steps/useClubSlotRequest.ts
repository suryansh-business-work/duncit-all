import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CLUB_SLOT_REQUEST_NOTICE_KEY, type ClubSlotRequestOutcome } from '@duncit/utils';
import { logs } from '@duncit/logs';
import { REQUEST_CLUB_VENUE_SLOTS } from '../../queries';

export interface ClubSlotRequestNotice {
  key: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

const SEVERITY: Readonly<Record<ClubSlotRequestOutcome, ClubSlotRequestNotice['severity']>> = {
  SENT: 'success',
  ALREADY_REQUESTED: 'info',
  NO_CLUB_ADMIN: 'warning',
};

const FAILED: ClubSlotRequestNotice = { key: 'mweb.createPod.slotRequestFailed', severity: 'error' };

interface RequestData {
  requestClubVenueSlots?: { status?: ClubSlotRequestOutcome | null } | null;
}

/**
 * "Message the club admin" from the no-slots dialog. The notice is kept against
 * the club it was sent for, so reopening the dialog on another club starts
 * clean. Native twin: useClubSlotRequest (rule 27).
 */
export function useClubSlotRequest(clubId: string) {
  const [request, { loading }] = useMutation<RequestData>(REQUEST_CLUB_VENUE_SLOTS);
  const [result, setResult] = useState<{ clubId: string; notice: ClubSlotRequestNotice } | null>(null);

  const ask = useCallback(async () => {
    try {
      const { data } = await request({ variables: { club_doc_id: clubId } });
      const status = data?.requestClubVenueSlots?.status;
      const notice = status
        ? { key: CLUB_SLOT_REQUEST_NOTICE_KEY[status], severity: SEVERITY[status] }
        : FAILED;
      setResult({ clubId, notice });
    } catch (error) {
      setResult({ clubId, notice: FAILED });
      logs.mWeb.error('useClubSlotRequest', 'ask', { error, club_id: clubId });
    }
  }, [clubId, request]);

  const notice = result?.clubId === clubId ? result.notice : null;
  return { ask, loading, notice };
}
