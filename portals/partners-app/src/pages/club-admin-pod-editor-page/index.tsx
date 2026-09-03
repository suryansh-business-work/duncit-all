import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { notifySuccess } from '@duncit/dialogs';
import {
  CLUB_ADMIN_POD_CONFIG,
  CLUB_ADMIN_POD_FOR_EDIT,
  CLUB_ADMIN_POD_LOOKUPS,
  getClubVenueIds,
  PodEditorPage,
  useClubAdminPodEditor,
  useMediaPickerBridge,
} from '@duncit/pod-form';
import { QueryGuard } from '@duncit/ui';
import { MediaPickerDialog } from '@duncit/media-picker';

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
      const createdMessage = draft ? t('clubAdmin.editor.draftSaved') : t('clubAdmin.editor.podCreated');
      notifySuccess(created ? createdMessage : t('clubAdmin.editor.podUpdated'));
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
        notFoundText={t('clubAdmin.editor.notFound')}
        notFoundSeverity="warning"
      >
        {() => (
          <PodEditorPage
            editing={!!pod}
            eyebrow={t('clubAdmin.editor.eyebrow', { vars: { club: club?.club_name ?? t('clubAdmin.clubs.pods') } })}
            onBack={() => navigate(backTo)}
            backLabel={t('clubAdmin.editor.backLabel')}
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
                <Alert severity="info">{t('clubAdmin.editor.hostNote')}</Alert>
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
        seedQuery={picker.seedQuery}
        accept={picker.accept}
      />
    </>
  );
}
