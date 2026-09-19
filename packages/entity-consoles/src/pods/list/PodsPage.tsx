import { useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { FormControlLabel, Snackbar, Stack, Switch } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import { useMediaPickerBridge } from '@duncit/pod-form';
import MediaPickerDialog from '@duncit/media-picker';
import PodActivityDialog from '../monitoring/PodActivityDialog';
import { PODS_TABLE, type PodRow } from './queries';
import CompletePodDialog from './complete-pod-dialog';
import ReleaseSummaryDialog from './ReleaseSummaryDialog';
import PodsTable from './PodsTable';
import PodsToolbar from './PodsToolbar';
import CreatePodLauncher from './CreatePodLauncher';
import type { PodLifecycleFilter } from './podLifecycle';
import { clubIdsInCategory, clubScopeFilter, scopedClubIds } from './podListFilters';
import QuickEditPodDialog from './QuickEditPodDialog';
import usePodDelete from './usePodDelete';
import usePodPageData from './usePodPageData';
import usePodReleaseRequest from './usePodReleaseRequest';
import { useTranslation } from '@duncit/shell';

/** An empty club scope is answered here: the table engine drops an `in` with
 * no values and would list every pod instead of none. */
const noRows = async () => ({ rows: [], total: 0 });

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
  // Super → Category → Sub. A pod's category is its club's, so it resolves to a club scope.
  const [category, setCategory] = useState<AdminCategoryValue>(EMPTY_CATEGORY);
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

  // The Club select and the category picker collapse into one club scope:
  // null = no constraint, [] = nothing can match (answered without a round trip).
  const clubIds = useMemo(
    () => scopedClubIds(clubFilter, clubIdsInCategory(lookups.clubs, lookups.categories, category)),
    [clubFilter, lookups.clubs, lookups.categories, category],
  );
  const scopeKey = clubIds?.join(',') ?? 'all';

  const fetchRows = useApolloTableFetch<PodRow>(
    client,
    PODS_TABLE,
    'podsTable',
    {
      extraFilters: clubScopeFilter(clubIds),
      // Asking for CANCELLED opts into soft-deleted rows on its own, so the
      // switch and the select never have to be set together.
      extraVariables: { include_deleted: showCancelled, lifecycle: lifecycle || null },
    },
    [scopeKey, showCancelled, lifecycle],
  );
  const rows = clubIds?.length === 0 ? noRows : fetchRows;

  // The club scope, the status select and the cancelled toggle all live
  // outside the table, so a change to any of them must trigger a reload.
  const prevScopeRef = useRef(`${scopeKey}|${showCancelled}|${lifecycle}`);
  useEffect(() => {
    const scope = `${scopeKey}|${showCancelled}|${lifecycle}`;
    if (prevScopeRef.current === scope) return;
    prevScopeRef.current = scope;
    refetchRef.current?.();
  }, [scopeKey, showCancelled, lifecycle]);

  // Filtering to the cancelled bucket is asking to see cancelled pods, so the
  // switch follows the select instead of sitting off beside a cancelled list.
  const pickLifecycle = (next: PodLifecycleFilter) => {
    setLifecycle(next);
    if (next === 'CANCELLED') setShowCancelled(true);
  };

  if (legacyEditId) return <Navigate to={`/pods/${legacyEditId}/edit`} replace />;

  return (
    <Stack spacing={3}>
      <PodsToolbar
        clubs={lookups.clubs}
        locations={lookups.locations}
        clubFilter={clubFilter}
        setClubFilter={(v) => (v ? setParams({ club_id: v }) : setParams({}))}
        lifecycle={lifecycle}
        setLifecycle={pickLifecycle}
        category={category}
        setCategory={setCategory}
      />

      <PodsTable
        fetchRows={rows}
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
        minPax={lookups.minPax}
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
