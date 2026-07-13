import { useEffect, useMemo, useRef, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Snackbar, Stack } from '@mui/material';
import { PodContentFormDialog, type PodContentValues } from '@duncit/portal-pod-form';
import {
  blankPodFormValues,
  buildPodInput,
  podToFormValues,
  type PodFormConfig,
  type PodFormValues,
} from '@duncit/pod-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import {
  PODS,
  CLUBS,
  LOCATIONS,
  APPROVED_VENUES,
  INVENTORY_PRODUCTS,
  USERS,
  FINANCE_FOR_PODS,
  CREATE,
  UPDATE,
  DELETE,
} from './queries';
import CompletePodDialog from './complete-pod-dialog';
import ReleaseSummaryDialog from './ReleaseSummaryDialog';
import PodsTable from './PodsTable';
import PodFormDialog from './PodFormDialog';
import PodsToolbar from './PodsToolbar';
import usePodReleaseRequest from './usePodReleaseRequest';

export default function PodsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const clubFilter = params.get('club_id') ?? '';
  const editId = params.get('edit') ?? '';
  const [search, setSearch] = useState('');

  const { data, loading, error, refetch } = useQuery(PODS, {
    variables: {
      filter: {
        club_id: clubFilter || undefined,
        search: search || undefined,
      },
    },
    fetchPolicy: 'cache-and-network',
  });
  const { data: clubsData } = useQuery(CLUBS);
  const { data: locsData } = useQuery(LOCATIONS);
  const { data: venuesData } = useQuery(APPROVED_VENUES);
  const { data: inventoryData } = useQuery(INVENTORY_PRODUCTS);
  const { data: usersData } = useQuery(USERS);
  const { data: financeData } = useQuery(FINANCE_FOR_PODS, { fetchPolicy: 'cache-first' });

  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<PodFormValues>(blankPodFormValues);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [quickPod, setQuickPod] = useState<any>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);
  const releaseRequest = usePodReleaseRequest({ refetch, setToast });

  const productsFlag = useFeatureFlag('is_product_visible');
  const config = useMemo<PodFormConfig>(
    () => ({
      showHosts: true,
      showLocationZone: true,
      showVenueSlot: false,
      showPlaceCharges: true,
      showInventory: true,
      showFinance: true,
      showIsActive: true,
      showProducts: productsFlag,
    }),
    [productsFlag]
  );

  // Bridge the URL-callback media picker to the shared form's promise picker.
  const pickImage = () =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerOpen(true);
    });
  const settlePicker = (url: string | null) => {
    pickerResolve.current?.(url);
    pickerResolve.current = null;
    setPickerOpen(false);
  };

  const saveQuickEdit = async (values: PodContentValues) => {
    if (!quickPod) return;
    setQuickBusy(true);
    setOpError(null);
    try {
      await updateMut({
        variables: {
          id: quickPod.id,
          input: {
            pod_title: values.pod_title,
            pod_description: values.pod_description,
            pod_images_and_videos: values.pod_images_and_videos.map((m) => ({ url: m.url, type: m.type || 'IMAGE' })),
          },
        },
      });
      setQuickPod(null);
      setToast('Saved');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setQuickBusy(false);
    }
  };

  const clubs = clubsData?.clubs ?? [];
  const locations = locsData?.locations ?? [];
  const approvedVenues = venuesData?.venues ?? [];
  const inventoryProducts = inventoryData?.inventoryProducts ?? [];
  const users = usersData?.users ?? [];

  const clubName = (id: string) => clubs.find((c: any) => c.id === id)?.club_name ?? '—';
  const locName = (id: string) => locations.find((l: any) => l.id === id)?.location_name ?? '—';
  const venueName = (id: string) => approvedVenues.find((v: any) => v.id === id)?.venue_name ?? '—';

  const openCreate = () => {
    setEditingId(null);
    setInitialValues({ ...blankPodFormValues, club_id: clubFilter || '' });
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (p: any) => {
    setEditingId(p.id);
    setInitialValues(podToFormValues(p));
    setOpError(null);
    setOpen(true);
  };

  // Deep-link from the Pod details page: /pods?edit=<id> opens the edit dialog.
  useEffect(() => {
    if (!editId || open) return;
    const pod = (data?.pods ?? []).find((p: any) => p.id === editId);
    if (pod) openEdit(pod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, data?.pods]);

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    setBusy(true);
    setOpError(null);
    try {
      const isDraft = options.draft;
      const input = buildPodInput(values, { draft: isDraft, config });
      if (editingId) {
        await updateMut({ variables: { id: editingId, input: { ...input, is_active: values.is_active } } });
      } else {
        await createMut({ variables: { input: { ...input, pod_id: values.pod_id || undefined } } });
      }
      setToast(isDraft ? 'Draft saved' : 'Saved');
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: any) => {
    const ok = await confirm({
      title: 'Delete pod',
      message: `Delete pod "${p.pod_title}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: p.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <PodsToolbar
        clubs={clubs}
        clubFilter={clubFilter}
        setClubFilter={(v) => (v ? setParams({ club_id: v }) : setParams({}))}
        search={search}
        setSearch={setSearch}
        onCreate={openCreate}
      />

      {error && <Alert severity="error">{error.message}</Alert>}

      <PodsTable
        loading={loading}
        pods={data?.pods ?? []}
        clubName={clubName}
        venueName={venueName}
        locName={locName}
        onEdit={openEdit}
        onQuickEdit={(p) => { setOpError(null); setQuickPod(p); }}
        onDelete={remove}
        onComplete={releaseRequest.openCompletePod}
        onView={(p) => navigate(`/pods/${p.id}`)}
      />

      <CompletePodDialog
        open={!!releaseRequest.completePod}
        pod={releaseRequest.completePod}
        users={users}
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
        open={open}
        onClose={() => setOpen(false)}
        initialValues={initialValues}
        config={config}
        busy={busy}
        opError={opError}
        clubs={clubs}
        venues={approvedVenues}
        inventoryProducts={inventoryProducts}
        users={users}
        onSubmit={submit}
        finance={financeData?.publicFinanceSettings}
        onPickImage={pickImage}
      />

      {quickPod && (
        <PodContentFormDialog
          open={!!quickPod}
          title="Quick edit pod"
          defaultValues={{
            pod_title: quickPod.pod_title || '',
            pod_description: quickPod.pod_description || '',
            pod_images_and_videos: (quickPod.pod_images_and_videos ?? []).map((m: any) => ({ url: m.url, type: m.type })),
          }}
          editableFields={['pod_title', 'pod_description', 'pod_images_and_videos']}
          readOnlyContext={[
            { label: 'Club', value: clubName(quickPod.club_id) },
            { label: 'Place', value: quickPod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(quickPod.venue_id) },
          ]}
          busy={quickBusy}
          error={opError}
          onClose={() => setQuickPod(null)}
          onSubmit={saveQuickEdit}
          onPickImage={pickImage}
        />
      )}

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => settlePicker(null)}
        onPicked={(url) => settlePicker(url)}
        folder="/pods/media"
        title="Add pod image"
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
