import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  PodEditorPage,
  makeNativeParityPodConfig,
  useMediaPickerBridge,
  usePodEditorState,
  type PodFormConfig,
} from '@duncit/pod-form';
import { useDateFormat, useFeatureFlag, useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { notifySuccess } from '@duncit/dialogs';
import { QueryGuard } from '@duncit/ui';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import AiFillButton from '../../../components/AiFillButton';
import { MEETING_PLATFORMS, generateMeetingLink } from '../meeting-platforms';
import { CREATE, POD_FOR_EDIT, UPDATE } from '../queries';
import usePodPageData from '../usePodPageData';
import usePodAiFill from './usePodAiFill';

const getClubVenueIds = (club: any): string[] => (club?.matched_venues ?? []).map((v: any) => v.id);

/**
 * The admin pod editor, as a page rather than a dialog: `/pods/new` and
 * `/pods/:id/edit`. It carries the club filter back to the list so cancelling
 * out of the editor returns to the same view the author left.
 */
export default function AdminPodEditorPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);

  const clubFilter = params.get('club_id') ?? '';
  const backTo = clubFilter ? `/pods?club_id=${clubFilter}` : '/pods';

  const lookups = usePodPageData();
  const picker = useMediaPickerBridge();
  const [createMut] = useMutation<any>(CREATE);
  const [updateMut] = useMutation<any>(UPDATE);

  const productsFlag = useFeatureFlag('is_product_visible');
  // Native-parity base (venue slots, place charges, reel, hosts) + admin extras.
  const config = useMemo<PodFormConfig>(
    () => ({
      ...makeNativeParityPodConfig({ showProducts: productsFlag }),
      requireHosts: true,
      singleHost: true,
      showLocationZone: true,
      showInventory: true,
      showFinance: true,
      showIsActive: true,
    }),
    [productsFlag],
  );

  const podQuery = useQuery<any>(POD_FOR_EDIT, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const pod = podQuery.data?.pod ?? null;

  const editor = usePodEditorState({
    config,
    editingPod: pod,
    createDefaults: { club_id: clubFilter },
    submitCreate: (input) => createMut({ variables: { input } }),
    submitUpdate: (podDocId, input) => updateMut({ variables: { id: podDocId, input } }),
    onSaved: ({ draft }) => {
      notifySuccess(draft ? 'Draft saved' : 'Saved');
      navigate(backTo);
    },
  });

  const ai = usePodAiFill({
    config,
    clubs: lookups.clubs,
    venues: lookups.approvedVenues,
    hosts: lookups.approvedHosts,
    getClubVenueIds,
  });

  return (
    <>
      <QueryGuard
        loading={podQuery.loading && !pod}
        error={podQuery.error}
        errorText={podQuery.error?.message}
        notFound={!!id && !pod}
        notFoundText="Pod not found."
        notFoundSeverity="warning"
      >
        {() => (
          <PodEditorPage
            editing={!!pod}
            eyebrow="Admin · Pods"
            onBack={() => navigate(backTo)}
            backLabel="Back to pods"
            initialValues={editor.initialValues}
            config={config}
            busy={editor.busy}
            error={editor.opError}
            clubs={lookups.clubs}
            venues={lookups.approvedVenues}
            users={lookups.approvedHosts}
            products={lookups.inventoryProducts}
            finance={lookups.finance}
            getClubVenueIds={getClubVenueIds}
            meetingPlatforms={[...MEETING_PLATFORMS]}
            onGenerateMeetingLink={generateMeetingLink}
            onPickImage={picker.pickImage}
            onPickVideo={picker.pickVideo}
            dateFormatter={fmt}
            slotLabels={slotLabels}
            editingPodDocId={editor.editingPodDocId}
            onSubmit={editor.submit}
            onReady={ai.onReady}
            hideDraftOnEdit
            titleExtras={<AiFillButton entity="POD" onFill={ai.handleAiFill} />}
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
