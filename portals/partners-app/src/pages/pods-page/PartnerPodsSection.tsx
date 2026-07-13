import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Card, CardContent, Dialog, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import { PodContentFormDialog, type PodContentValues } from '@duncit/portal-pod-form';
import { PodForm, blankPodFormValues, buildPodInput, type PodFormValues } from '@duncit/pod-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { CREATE_PARTNER_POD, HOST_UPDATE_POD, PARTNER_PODS_PAGE } from './queries';
import PartnerPodsTable from './PartnerPodsTable';
import { PARTNER_POD_CONFIG, getClubVenueIds } from './partner-pod-config';

export default function PartnerPodsSection() {
  const { data, loading, error, refetch } = useQuery(PARTNER_PODS_PAGE, { fetchPolicy: 'cache-and-network' });
  const [createPod, createState] = useMutation(CREATE_PARTNER_POD);
  const [hostUpdatePod, updateState] = useMutation(HOST_UPDATE_POD);
  const [open, setOpen] = useState(false);
  const [editPod, setEditPod] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);
  const clubs = data?.clubs ?? [];
  const venues = (data?.myVenues ?? []).filter((venue: any) => venue.status === 'APPROVED' && venue.is_active);
  const products = data?.availablePodProducts ?? [];
  const approvedHost = data?.myHost?.status === 'APPROVED';
  const clubName = (id: string) => clubs.find((club: any) => club.id === id)?.club_name ?? 'Club';
  const venueName = (id?: string | null) => venues.find((venue: any) => venue.id === id)?.venue_name ?? 'Venue';

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    setOpError(null);
    try {
      await createPod({ variables: { input: buildPodInput(values, { draft: options.draft, config: PARTNER_POD_CONFIG }) } });
      setOpen(false);
      setMessage(options.draft ? 'Pod draft saved.' : 'Pod created.');
      await refetch();
    } catch (submitError: any) {
      setOpError(submitError.message);
    }
  };

  // Bridge the URL-callback MediaPickerDialog to the package's promise-based picker.
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

  const saveEdit = async (values: PodContentValues) => {
    if (!editPod) return;
    setOpError(null);
    try {
      await hostUpdatePod({
        variables: {
          pod_doc_id: editPod.id,
          input: {
            pod_title: values.pod_title,
            pod_description: values.pod_description,
            pod_images_and_videos: values.pod_images_and_videos.map((m) => ({ url: m.url, type: m.type || 'IMAGE' })),
          },
        },
      });
      setEditPod(null);
      setMessage('Pod updated.');
      await refetch();
    } catch (editError: any) {
      setOpError(editError.message);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
            <Stack spacing={0.25}>
              <Typography variant="h6" fontWeight={950}>Pods</Typography>
              <Typography variant="body2" color="text.secondary">Create and manage pods from your approved host profile.</Typography>
            </Stack>
            <Button variant="contained" startIcon={<AddIcon />} disabled={!approvedHost} onClick={() => setOpen(true)}>New Pod</Button>
          </Stack>
          {!approvedHost && <Alert severity="info">Host approval is required before creating pods.</Alert>}
          {error && <Alert severity="error">{error.message}</Alert>}
          <PartnerPodsTable loading={loading && !data} pods={data?.myHostPods ?? []} clubName={clubName} venueName={venueName} onEdit={(pod) => { setOpError(null); setEditPod(pod); }} />
        </Stack>
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New Pod</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 1.5 }}>Your approved host profile is added as the pod host automatically.</Alert>
          <PodForm
            initialValues={blankPodFormValues}
            config={PARTNER_POD_CONFIG}
            clubs={clubs}
            venues={venues}
            products={products}
            getClubVenueIds={getClubVenueIds}
            busy={createState.loading}
            error={opError}
            onCancel={() => setOpen(false)}
            onSubmit={submit}
          />
        </DialogContent>
      </Dialog>

      {editPod && (
        <PodContentFormDialog
          open={!!editPod}
          title="Edit pod"
          defaultValues={{
            pod_title: editPod.pod_title || '',
            pod_description: editPod.pod_description || '',
            pod_images_and_videos: (editPod.pod_images_and_videos ?? []).map((m: any) => ({ url: m.url, type: m.type })),
          }}
          editableFields={['pod_title', 'pod_description', 'pod_images_and_videos']}
          readOnlyContext={[
            { label: 'Date', value: editPod.pod_date_time ? format(new Date(editPod.pod_date_time), 'dd MMM yyyy, h:mm a') : 'Not scheduled' },
            { label: 'Place', value: editPod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(editPod.venue_id) },
            { label: 'Attendees', value: String(editPod.pod_attendees?.length ?? 0) },
          ]}
          busy={updateState.loading}
          error={opError}
          onClose={() => setEditPod(null)}
          onSubmit={saveEdit}
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
      <Snackbar open={!!message} autoHideDuration={2500} message={message ?? ''} onClose={() => setMessage(null)} />
    </Card>
  );
}
