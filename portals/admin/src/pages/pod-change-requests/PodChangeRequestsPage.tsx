import { useCallback, useMemo, useRef, useState } from 'react';
import { Snackbar, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';
import ChangeRequestTable from './ChangeRequestTable';
import AssignDrawer from './AssignDrawer';
import CancelPodDialog from './CancelPodDialog';

/** The three queues, as stable slugs — `?selectedtab=venue` survives a reload. */
type Tab = 'venue' | 'host' | 'club-admin';

const ROLE_BY_TAB: Record<Tab, PodChangeRole> = {
  venue: 'VENUE',
  host: 'HOST',
  'club-admin': 'CLUB_ADMIN',
};

/**
 * Admin > Pods > Change Requests.
 *
 * One queue per role, because the two actions differ by role in what they
 * offer: a venue request needs a venue AND a slot, a host request a person, a
 * club-admin request a person who runs a club. The rows themselves are the same
 * record every partner studio shows, read from the other end.
 */
export default function PodChangeRequestsPage() {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const [assign, setAssign] = useState<PodChangeRow | null>(null);
  const [cancelling, setCancelling] = useState<PodChangeRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const items = useMemo(
    () => [
      { value: 'venue' as const, label: t('admin.changeRequests.tabVenue') },
      { value: 'host' as const, label: t('admin.changeRequests.tabHost') },
      { value: 'club-admin' as const, label: t('admin.changeRequests.tabClubAdmin') },
    ],
    [t]
  );
  const tabs = useTabParam<Tab>({ items, fallback: 'venue' });

  // Stable identities: the columns memo takes them as deps, and a new function
  // every render would rebuild every column on every keystroke in the search.
  const onAssign = useCallback((row: PodChangeRow) => setAssign(row), []);
  const onCancelPod = useCallback((row: PodChangeRow) => setCancelling(row), []);

  const done = (text: string) => {
    setMessage(text);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={t('admin.changeRequests.title')}
        subtitle={t('admin.changeRequests.subtitle')}
      />
      <DuncitTabs {...tabs} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile />
      <ChangeRequestTable
        role={ROLE_BY_TAB[tabs.value]}
        onAssign={onAssign}
        onCancelPod={onCancelPod}
        refetchRef={refetchRef}
      />
      <AssignDrawer request={assign} onClose={() => setAssign(null)} onOffered={done} />
      <CancelPodDialog
        request={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={done}
      />
      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        message={message ?? ''}
        onClose={() => setMessage(null)}
      />
    </Stack>
  );
}
