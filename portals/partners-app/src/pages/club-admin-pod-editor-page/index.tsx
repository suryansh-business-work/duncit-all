import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { notifySuccess } from '@duncit/dialogs';
import { PodEditorPage, useMediaPickerBridge } from '@duncit/pod-form';
import { QueryGuard } from '@duncit/ui';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { getClubVenueIds } from '../pods-page/partner-pod-config';
import {
  CLUB_ADMIN_POD_FOR_EDIT,
  CLUB_ADMIN_POD_LOOKUPS,
} from '../club-admin-club-pods-page/queries';
import useClubAdminPodEditor, {
  CLUB_ADMIN_POD_CONFIG,
} from '../club-admin-club-pods-page/useClubAdminPodEditor';

/**
 * The Club Admin's pod editor, as a page rather than a dialog:
 * `/club-admin/clubs/:clubId/pods/new` and `…/pods/:id/edit`.
 */
export default function ClubAdminPodEditorPage() {
  const { clubId = '', id = '' } = useParams();
  const navigate = useNavigate();
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);
  const picker = useMediaPickerBridge();

  const backTo = `/club-admin/clubs/${clubId}`;
  const lookups = useQuery<any>(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const podQuery = useQuery<any>(CLUB_ADMIN_POD_FOR_EDIT, {
    variables: { pod_doc_id: id },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const pod = podQuery.data?.clubAdminPodForEdit ?? null;

  const clubs = lookups.data?.myAdminClubs ?? [];
  const venues = (lookups.data?.myVenues ?? []).filter(
    (venue: any) => venue.status === 'APPROVED' && venue.is_active,
  );
  const products = lookups.data?.availablePodProducts ?? [];
  const club = clubs.find((item: any) => item.id === clubId);

  const editor = useClubAdminPodEditor({
    clubId,
    editingPod: pod,
    onSaved: ({ created, draft }) => {
      const createdMessage = draft ? 'Pod draft saved.' : 'Pod created.';
      notifySuccess(created ? createdMessage : 'Pod updated.');
      navigate(backTo);
    },
  });

  return (
    <>
      <QueryGuard
        loading={podQuery.loading && !pod}
        error={podQuery.error}
        errorText={podQuery.error?.message}
        notFound={!!id && !pod}
        notFoundText="Pod not found in this club."
        notFoundSeverity="warning"
      >
        {() => (
          <PodEditorPage
            editing={!!pod}
            eyebrow={`Club Admin · ${club?.club_name ?? 'Pods'}`}
            onBack={() => navigate(backTo)}
            backLabel="Back to pods"
            initialValues={editor.initialValues}
            config={CLUB_ADMIN_POD_CONFIG}
            busy={editor.busy}
            error={editor.opError}
            clubs={clubs}
            venues={venues}
            users={editor.hostSeed}
            products={products}
            getClubVenueIds={getClubVenueIds}
            onPickImage={picker.pickImage}
            onPickVideo={picker.pickVideo}
            searchHosts={editor.searchHosts}
            dateFormatter={fmt}
            slotLabels={slotLabels}
            editingPodDocId={editor.editingPodDocId}
            onSubmit={editor.submit}
            intro={
              <>
                {lookups.error && <Alert severity="error">{lookups.error.message}</Alert>}
                <Alert severity="info">
                  You are added as the pod host automatically unless you assign hosts below.
                </Alert>
              </>
            }
          />
        )}
      </QueryGuard>

      <MediaPickerDialog
        open={picker.pickerOpen}
        onClose={() => picker.settlePicker(null)}
        onPicked={(url) => picker.settlePicker(url)}
        folder="/pods/media"
        title={picker.title}
        accept={picker.accept}
      />
    </>
  );
}
