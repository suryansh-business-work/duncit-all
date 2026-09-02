import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '@mui/material';
import {
  PodEditorPage,
  makeNativeParityPodConfig,
  useAutoPodEditorState,
  useMediaPickerBridge,
  type PodFormConfig,
} from '@duncit/pod-form';
import { useDateFormat, useFeatureFlag, useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { notifySuccess } from '@duncit/dialogs';
import { QueryGuard } from '@duncit/ui';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import { AUTO_PODS_PATH } from '../../../config/app-config';
import { FINANCE_FOR_PODS, INVENTORY_PRODUCTS } from '../../pods-page/queries';
import { MEETING_PLATFORMS, generateMeetingLink } from '../../pods-page/meeting-platforms';
import { AUTO_POD_FOR_EDIT, CREATE_AUTO_POD, UPDATE_AUTO_POD, type AutoPodEditRow } from '../queries';

/** An Auto Pod has no club, so there is never a venue to narrow by. */
const getClubVenueIds = (): string[] => [];

/**
 * The admin Auto Pod editor, as a page: `/auto-pods/new` and
 * `/auto-pods/:id/edit`. It is the ordinary pod editor in `autoPod` mode — a
 * three-step stepper: the category and who could enrol in it, the pod itself
 * (minus everything a venue, a host and a club admin supply when they enrol),
 * then a read-only review above the roll-out button.
 */
export default function AdminAutoPodEditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);

  const picker = useMediaPickerBridge();
  const [createMut] = useMutation<any>(CREATE_AUTO_POD);
  const [updateMut] = useMutation<any>(UPDATE_AUTO_POD);
  const { data: financeData } = useQuery<any>(FINANCE_FOR_PODS, { fetchPolicy: 'cache-first' });
  // Products follow the same flag the ordinary editor reads; the catalogue is
  // only fetched when they can be shown at all.
  const productsFlag = useFeatureFlag('is_product_visible');
  const { data: productsData } = useQuery<any>(INVENTORY_PRODUCTS, {
    fetchPolicy: 'cache-first',
    skip: !productsFlag,
  });

  const autoPodQuery = useQuery<any>(AUTO_POD_FOR_EDIT, {
    variables: { auto_pod_doc_id: id },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const autoPod: AutoPodEditRow | null = autoPodQuery.data?.autoPod ?? null;

  // Once a host or a club has enrolled they did so for THIS category, so it
  // stays put; the rest of the template is still the admin's to rewrite.
  const lockCategory = !!(autoPod?.host_claim || autoPod?.club_claim);
  // No place charges and no earnings projection: both need a venue, and the
  // template has none. The audience counts are the admin's to see (step 1).
  const config = useMemo<PodFormConfig>(
    () => ({
      ...makeNativeParityPodConfig({ showProducts: productsFlag }),
      autoPod: true,
      lockCategory,
      showAutoPodAudience: true,
      showHosts: false,
      showVenueSlot: false,
      showPlaceCharges: false,
      showReel: true,
      showFinance: false,
    }),
    [lockCategory, productsFlag],
  );

  const editor = useAutoPodEditorState({
    editingAutoPod: autoPod,
    submitCreate: (input) => createMut({ variables: { input } }),
    submitUpdate: (autoPodDocId, input) =>
      updateMut({ variables: { auto_pod_doc_id: autoPodDocId, input } }),
    onSaved: ({ created }) => {
      notifySuccess(created ? t('admin.autoPods.openedAnyOrder') : t('admin.autoPods.updated'));
      navigate(AUTO_PODS_PATH);
    },
  });

  const error = editor.opError
    ? t('admin.autoPods.saveFailed', { vars: { reason: editor.opError } })
    : null;
  const title = autoPod ? t('admin.autoPods.editTitle') : t('admin.autoPods.newTitle');

  return (
    <>
      <QueryGuard
        loading={autoPodQuery.loading && !autoPod}
        error={autoPodQuery.error}
        errorText={autoPodQuery.error?.message}
        notFound={!!id && !autoPod}
        notFoundSeverity="warning"
      >
        {() => (
          <PodEditorPage
            editing={!!autoPod}
            title={title}
            eyebrow={t('admin.autoPods.eyebrow')}
            onBack={() => navigate(AUTO_PODS_PATH)}
            backLabel={t('admin.autoPods.backToList')}
            intro={<Alert severity="info">{t('admin.autoPods.noVenueHostHint')}</Alert>}
            initialValues={editor.initialValues}
            config={config}
            busy={editor.busy}
            error={error}
            clubs={[]}
            venues={[]}
            products={productsData?.inventoryProducts ?? []}
            finance={financeData?.publicFinanceSettings}
            getClubVenueIds={getClubVenueIds}
            meetingPlatforms={[...MEETING_PLATFORMS]}
            onGenerateMeetingLink={generateMeetingLink}
            onPickImage={picker.pickImage}
            onPickVideo={picker.pickVideo}
            dateFormatter={fmt}
            slotLabels={slotLabels}
            onSubmit={(values) => editor.submit(values)}
            hideDraftOnEdit
          />
        )}
      </QueryGuard>

      <MediaPickerDialog
        open={picker.pickerOpen}
        onClose={() => picker.settlePicker(null)}
        onPicked={(url) => picker.settlePicker(url)}
        folder="/auto-pods"
        title={picker.title}
        accept={picker.accept}
      />
    </>
  );
}
