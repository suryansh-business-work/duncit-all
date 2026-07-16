import { useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { makeNativeParityPodConfig, useMediaPickerBridge, type PodFormConfig } from '@duncit/pod-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { useFeatureFlag } from '@duncit/app-settings';
import { PODS_TABLE, type PodRow } from './queries';
import CompletePodDialog from './complete-pod-dialog';
import ReleaseSummaryDialog from './ReleaseSummaryDialog';
import PodsTable from './PodsTable';
import PodFormDialog from './PodFormDialog';
import PodsToolbar from './PodsToolbar';
import QuickEditPodDialog from './QuickEditPodDialog';
import usePodEditor from './usePodEditor';
import usePodPageData from './usePodPageData';
import usePodReleaseRequest from './usePodReleaseRequest';

export default function PodsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const clubFilter = params.get('club_id') ?? '';
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const lookups = usePodPageData();
  const [toast, setToast] = useState<string | null>(null);
  const [quickPod, setQuickPod] = useState<PodRow | null>(null);
  const picker = useMediaPickerBridge();
  const releaseRequest = usePodReleaseRequest({
    refetch: async () => refetchRef.current?.(),
    setToast,
  });

  const productsFlag = useFeatureFlag('is_product_visible');
  // Native-parity base (venue slots, place charges, reel, hosts) + admin extras.
  const config = useMemo<PodFormConfig>(
    () => ({
      ...makeNativeParityPodConfig({ showProducts: productsFlag }),
      requireHosts: true,
      showLocationZone: true,
      showInventory: true,
      showFinance: true,
      showIsActive: true,
    }),
    [productsFlag]
  );

  const editor = usePodEditor({
    config,
    clubFilter,
    editId: params.get('edit') ?? '',
    onChanged: (message) => {
      setToast(message);
      refetchRef.current?.();
    },
  });

  const fetchRows = useApolloTableFetch<PodRow>(
    client,
    PODS_TABLE,
    'podsTable',
    { extraFilters: clubFilter ? [{ field: 'club_id', op: 'eq', value: clubFilter }] : undefined },
    [clubFilter],
  );

  // The club select lives outside the table, so a change must trigger a reload.
  const prevClubRef = useRef(clubFilter);
  useEffect(() => {
    if (prevClubRef.current === clubFilter) return;
    prevClubRef.current = clubFilter;
    refetchRef.current?.();
  }, [clubFilter]);

  return (
    <Stack spacing={3}>
      <PodsToolbar
        clubs={lookups.clubs}
        clubFilter={clubFilter}
        setClubFilter={(v) => (v ? setParams({ club_id: v }) : setParams({}))}
      />

      <PodsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={editor.openCreate}>
            New Pod
          </Button>
        }
        clubName={lookups.clubName}
        venueName={lookups.venueName}
        locName={lookups.locName}
        onEdit={editor.openEdit}
        onQuickEdit={setQuickPod}
        onDelete={editor.remove}
        onComplete={releaseRequest.openCompletePod}
        onView={(p) => navigate(`/pods/${p.id}`)}
      />

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

      <PodFormDialog
        open={editor.open}
        editing={!!editor.editingPod}
        onClose={editor.close}
        initialValues={editor.initialValues}
        config={config}
        busy={editor.busy}
        opError={editor.opError}
        clubs={lookups.clubs}
        venues={lookups.approvedVenues}
        inventoryProducts={lookups.inventoryProducts}
        users={lookups.users}
        onSubmit={editor.submit}
        finance={lookups.finance}
        onPickImage={picker.pickImage}
        onPickVideo={picker.pickVideo}
      />

      <QuickEditPodDialog
        pod={quickPod}
        clubName={lookups.clubName}
        venueName={lookups.venueName}
        onClose={() => setQuickPod(null)}
        onSaved={() => {
          setQuickPod(null);
          setToast('Saved');
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
