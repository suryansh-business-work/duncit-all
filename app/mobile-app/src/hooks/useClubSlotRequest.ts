import { useCallback, useState } from 'react';
import { CLUB_SLOT_REQUEST_NOTICE_KEY, type ClubSlotRequestOutcome } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { RequestClubVenueSlotsDocument } from '@/graphql/club-slots';
import { graphqlRequest } from '@/services/graphql.client';

export interface ClubSlotRequestNotice {
  key: string;
  /** The theme colour the line is drawn in — mWeb's Alert severity, as a token. */
  color: '$color' | '$warning' | '$danger';
  /** True once the admin was told (or already had been) — the button retires. */
  done: boolean;
}

const COLOR: Readonly<Record<ClubSlotRequestOutcome, ClubSlotRequestNotice['color']>> = {
  SENT: '$color',
  ALREADY_REQUESTED: '$color',
  NO_CLUB_ADMIN: '$warning',
};

const FAILED: ClubSlotRequestNotice = {
  key: 'mweb.createPod.slotRequestFailed',
  color: '$danger',
  done: false,
};

/**
 * "Message the club admin" from the no-slots dialog. The notice is kept against
 * the club it was sent for, so reopening the dialog on another club starts
 * clean. mWeb twin: steps/useClubSlotRequest (rule 27).
 */
export function useClubSlotRequest(clubId: string) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ clubId: string; notice: ClubSlotRequestNotice } | null>(
    null,
  );

  const ask = useCallback(async () => {
    setLoading(true);
    try {
      const data = await graphqlRequest(
        RequestClubVenueSlotsDocument,
        { club_doc_id: clubId },
        { auth: true },
      );
      const status = data.requestClubVenueSlots.status as ClubSlotRequestOutcome;
      setResult({
        clubId,
        notice: { key: CLUB_SLOT_REQUEST_NOTICE_KEY[status], color: COLOR[status], done: true },
      });
    } catch (error) {
      setResult({ clubId, notice: FAILED });
      logs.mobileApp.error('useClubSlotRequest', 'ask', { error, club_id: clubId });
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  const notice = result?.clubId === clubId ? result.notice : null;
  return { ask, loading, notice };
}
