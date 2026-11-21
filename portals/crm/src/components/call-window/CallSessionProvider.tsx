import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Snackbar } from '@mui/material';
import { PageErrorBoundary, useTranslation } from '@duncit/shell';
import { MY_ACTIVE_CRM_CALL, type LiveCallLog } from '../../api/call.gql';
import { getToken } from '../../lib/session';
import { CallSessionContext } from './callSessionContext';
import type { CallLead } from './callSession.types';
import { useCallSession } from './useCallSession';
import CallWindow from './CallWindow';

const leadOf = (log: LiveCallLog): CallLead => ({
  to: log.contact_value,
  entityType: log.entity_type,
  entityId: log.entity_id,
  displayName: log.contact_name || log.contact_value,
  contactName: log.contact_name ?? undefined,
});

/**
 * Owns the agent's one call and its window above every page, so moving to
 * another lead or page never drops the call UI. After a reload, a call that
 * is still live on the server comes back — minimized state aside — with its
 * status, mute / hold and transcript so far.
 */
export default function CallSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const session = useCallSession();
  const { live, lead, prepare, restore, clear } = session;
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { data } = useQuery<{ myActiveCrmCall: LiveCallLog | null }>(MY_ACTIVE_CRM_CALL, {
    skip: !getToken(),
    fetchPolicy: 'network-only',
  });
  const active = data?.myActiveCrmCall ?? null;

  useEffect(() => {
    if (!active) return;
    restore(active, leadOf(active));
    setOpen(true);
  }, [active, restore]);

  const openCall = useCallback(
    (next: CallLead) => {
      if (live) {
        // One call at a time: bring the live one forward instead of replacing it.
        if (lead?.entityId !== next.entityId) setNotice(t('crm.call.anotherCallActive'));
      } else {
        prepare(next);
      }
      setOpen(true);
    },
    [live, lead, prepare, t]
  );

  const close = () => {
    setOpen(false);
    clear();
  };

  const api = useMemo(() => ({ openCall, live }), [openCall, live]);

  return (
    <CallSessionContext.Provider value={api}>
      {children}
      {open && lead && (
        <PageErrorBoundary>
          <CallWindow session={session} onClose={close} />
        </PageErrorBoundary>
      )}
      <Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice(null)} message={notice ?? ''} />
    </CallSessionContext.Provider>
  );
}
