import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box } from '@mui/material';
import { buildSlotLabels } from '@duncit/slots';
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
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { notifySuccess } from '../../components/notify';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';

/** What the toast says once a save lands, by what kind of save it was. */
function savedMessage(t: Translate, created: boolean, draft: boolean): string {
  if (!created) return t('clubAdmin.editor.podUpdated');
  if (draft) return t('clubAdmin.editor.draftSaved');
  return t('clubAdmin.editor.podCreated');
}

/** The editor's pick lists, out of the one lookups document. Only an approved,
 * active venue can be booked, so the rest never reach the select. */
function editorLookups(data: any, clubId: string) {
  const clubs: any[] = data?.myAdminClubs ?? [];
  const venues: any[] = (data?.myVenues ?? []).filter(
    (venue: any) => venue.status === 'APPROVED' && venue.is_active,
  );
  const products: any[] = data?.availablePodProducts ?? [];
  const club = clubs.find((item) => item.id === clubId);
  return { clubs, venues, products, club };
}

/**
 * The Club Admin's pod editor on the phone — `/clubs/:clubId/pods/new` and
 * `…/pods/:id/edit` — over the SAME editor, documents and wiring the Partners
 * console mounts (`@duncit/pod-form`, rule 40). Native twin: ClubPodEditor.
 */
export default function ClubPodEditorPage() {
  const { clubId = '', id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dateFormatter = useDateFormat();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'mweb.slots'), [t]);
  const picker = useMediaPickerBridge();
  const backTo = `/clubs/${clubId}/pods`;

  const lookups = useQuery<any>(CLUB_ADMIN_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const podQuery = useQuery<any>(CLUB_ADMIN_POD_FOR_EDIT, {
    variables: { pod_doc_id: id },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const pod = podQuery.data?.clubAdminPodForEdit ?? null;
  const { clubs, venues, products, club } = editorLookups(lookups.data, clubId);

  const editor = useClubAdminPodEditor({
    clubId,
    editingPod: pod,
    onSaved: ({ created, draft }) => {
      notifySuccess(savedMessage(t, created, draft));
      navigate(backTo);
    },
  });

  const formProps = {
    initialValues: editor.initialValues,
    config: CLUB_ADMIN_POD_CONFIG,
    busy: editor.busy,
    error: editor.opError,
    editingPodDocId: editor.editingPodDocId,
    onSubmit: editor.submit,
    searchHosts: editor.searchHosts,
    users: editor.hostSeed,
    clubs,
    venues,
    products,
    getClubVenueIds,
    dateFormatter,
    slotLabels,
    onPickImage: picker.pickImage,
    onPickVideo: picker.pickVideo,
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
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
            eyebrow={t('clubAdmin.editor.eyebrow', {
              vars: { club: club?.club_name ?? t('clubAdmin.clubs.pods') },
            })}
            onBack={() => navigate(backTo)}
            backLabel={t('clubAdmin.editor.backLabel')}
            intro={
              <>
                {lookups.error && <Alert severity="error">{lookups.error.message}</Alert>}
                <Alert severity="info">{t('clubAdmin.editor.hostNote')}</Alert>
              </>
            }
            {...formProps}
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
    </Box>
  );
}
