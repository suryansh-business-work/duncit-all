import { useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { FormControlLabel, Snackbar, Stack, Switch } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useMediaPickerBridge } from '@duncit/pod-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import PodActivityDialog from '../pod-monitoring/PodActivityDialog';
import { PODS_TABLE, type PodRow } from './queries';
import CompletePodDialog from './complete-pod-dialog';
import ReleaseSummaryDialog from './ReleaseSummaryDialog';
import PodsTable from './PodsTable';
import PodsToolbar from './PodsToolbar';
import CreatePodLauncher from './CreatePodLauncher';
import type { PodLifecycleFilter } from './podLifecycle';
import QuickEditPodDialog from './QuickEditPodDialog';
import usePodDelete from './usePodDelete';
import usePodPageData from './usePodPageData';
import usePodReleaseRequest from './usePodReleaseRequest';
import { useTranslation } from '@duncit/shell';

export default function PodsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const clubFilter = params.get('club_id') ?? '';
  // Bookmarks from before the editor became a page still point at /pods?edit=.
  const legacyEditId = params.get('edit') ?? '';
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const lookups = usePodPageData();
  const [toast, setToast] = useState<string | null>(null);
  const [quickPod, setQuickPod] = useState<PodRow | null>(null);
  const [trailPod, setTrailPod] = useState<PodRow | null>(null);
  // Cancelled pods stay editable, so they must be findable — off by default.
  const [showCancelled, setShowCancelled] = useState(false);
  // Upcoming / Ongoing / Completed / Cancelled. Derived from the pod's dates
  // server-side, so it is a query argument rather than a table column filter.
  const [lifecycle, setLifecycle] = useState<PodLifecycleFilter>('');
  const picker = useMediaPickerBridge();
  const releaseRequest = usePodReleaseRequest({
    refetch: async () => refetchRef.current?.(),
    setToast,
  });

  const remove = usePodDelete({
    onChanged: (message) => {
      setToast(message);
      refetchRef.current?.();
    },
  });

  // The editor is its own route now, so the club filter rides along and comes
  // back with the author when they cancel or save.
  const editorSuffix = clubFilter ? `?club_id=${clubFilter}` : '';

  const fetchRows = useApolloTableFetch<PodRow>(
    client,
    PODS_TABLE,
    'podsTable',
    {
      extraFilters: clubFilter ? [{ field: 'club_id', op: 'eq', value: clubFilter }] : undefined,
      // Asking for CANCELLED opts into soft-deleted rows on its own, so the
      // switch and the select never have to be set together.
      extraVariables: { include_deleted: showCancelled, lifecycle: lifecycle || null },
    },
    [clubFilter, showCancelled, lifecycle],
  );

  // The club select, the status select and the cancelled toggle all live
  // outside the table, so a change to any of them must trigger a reload.
  const prevScopeRef = useRef(`${clubFilter}|${showCancelled}|${lifecycle}`);
  useEffect(() => {
    const scope = `${clubFilter}|${showCancelled}|${lifecycle}`;
    if (prevScopeRef.current === scope) return;
    prevScopeRef.current = scope;
    refetchRef.current?.();
  }, [clubFilter, showCancelled, lifecycle]);

  if (legacyEditId) return <Navigate to={`/pods/${legacyEditId}/edit`} replace />;

  return (
    <Stack spacing={3}>
      <PodsToolbar
        clubs={lookups.clubs}
        clubFilter={clubFilter}
        setClubFilter={(v) => (v ? setParams({ club_id: v }) : setParams({}))}
        lifecycle={lifecycle}
        setLifecycle={setLifecycle}
      />

      <PodsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                />
              }
              label={t('admin.pods.includeCancelled')}
              slotProps={{ typography: { variant: 'body2' } }}
            />
            <CreatePodLauncher onNormal={() => navigate(`/pods/new${editorSuffix}`)} />
          </>
        }
        clubName={lookups.clubName}
        venueName={lookups.venueName}
        locName={lookups.locName}
        onEdit={(p) => navigate(`/pods/${p.id}/edit${editorSuffix}`)}
        onQuickEdit={setQuickPod}
        onDelete={remove}
        onComplete={releaseRequest.openCompletePod}
        onMonitor={setTrailPod}
        onView={(p) => navigate(`/pods/${p.id}`)}
      />

      <PodActivityDialog pod={trailPod} onClose={() => setTrailPod(null)} />

      <CompletePodDialog
        open={!!releaseRequest.completePod}
        pod={releaseRequest.completePod}
        users={lookups.users}
        busy={releaseRequest.releaseBusy}
        errorMessage={releaseRequest.releaseError}
        onClose={() => releaseRequest.setCompletePod(null)}
        onSubmit={(values) => releaseRequest.submitComplete(values)}
      />

      <ReleaseSummaryDialog
        summary={releaseRequest.releaseSummary}
        onClose={releaseRequest.closeReleaseSummary}
      />

      <QuickEditPodDialog
        pod={quickPod}
        clubName={lookups.clubName}
        venueName={lookups.venueName}
        onClose={() => setQuickPod(null)}
        onSaved={() => {
          setQuickPod(null);
          setToast(t('shell.common.saved'));
          refetchRef.current?.();
        }}
        onPickImage={picker.pickImage}
      />

      <MediaPickerDialog
        open={picker.pickerOpen}
        onClose={() => picker.settlePicker(null)}
        onPicked={(url) => picker.settlePicker(url)}
        folder="/pods/media"
        title={picker.title}
        seedQuery={picker.seedQuery}
        accept={picker.accept}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
