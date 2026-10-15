import { useParams } from 'react-router';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { venueCategoryList } from '@duncit/utils';
import useMediaPicker from '../../shared/useMediaPicker';
import EditorPageShell from '../../shared/EditorPageShell';
import { useVenueEditor } from './useVenueEditor';
import VenueEditorNav from './VenueEditorNav';
import VenueDetailsSection from './sections/VenueDetailsSection';
import TypeCapacitySection from './sections/TypeCapacitySection';
import FoodSection from './sections/FoodSection';
import AmenitiesSection from './sections/AmenitiesSection';
import DocumentsSection from './sections/DocumentsSection';
import OwnerSection from './sections/OwnerSection';
import PayoutSection from './sections/PayoutSection';
import LeavesSection from './sections/LeavesSection';
import OperationsSection from './sections/OperationsSection';
import CancellationSection from './sections/CancellationSection';
import StatusSection from './sections/StatusSection';

/**
 * `/venues/new` and `/venues/:venueId/edit` — the whole venue record, editable.
 *
 * A PAGE rather than a dialog because there is no version of this that fits in
 * a modal: a venue carries eleven sections, two cancellation ladders and the
 * operating rules its bookings are generated from. The frame comes from
 * `EditorPageShell`, so this file is only which sections a venue has and in what
 * order.
 *
 * That order is the OWNER's: the first eight sections are the Partners portal's
 * registration sections, under the same names and in the same sequence, so the
 * person on the phone with an owner is looking at the form the owner is. The
 * staff-only ones — operations, cancellation, status and money — come after.
 * Unlike the owner's form it stays one page with one Save; the strip at the top
 * (`VenueEditorNav`) is what gives it the same at-a-glance list of sections.
 */
export default function VenueEditorPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const picker = useMediaPicker('/venues');
  const editor = useVenueEditor(venueId);
  const { form, config, venue, isEdit, canGovern, busy, saveError, submit } = editor;
  const { control, setValue } = form;

  const backTo = isEdit && venueId ? `/venues/${venueId}` : '/venues';
  const title = isEdit
    ? venue?.venue_name || t('directory.venueEditor.editTitle')
    : t('directory.venueEditor.newTitle');
  const eyebrow = isEdit
    ? t('directory.venueEditor.eyebrowEdit')
    : t('directory.venueEditor.eyebrowNew');
  // An empty category list leaves the stored ones alone (see `valuesToStep1`),
  // so a venue that has categories keeps at least one row.
  const minCategories = venueCategoryList(venue).length > 0 ? 1 : 0;

  return (
    <QueryGuard
      loading={editor.loading}
      error={editor.error}
      errorText={editor.error?.message}
      notFound={isEdit && !venue}
      notFoundText={t('admin.venueDetails.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (
        <EditorPageShell
          eyebrow={eyebrow}
          title={title}
          backTo={backTo}
          saveLabel={t('directory.venueEditor.save')}
          busy={busy}
          error={saveError}
          onSubmit={form.handleSubmit(submit)}
          picker={picker}
        >
          <VenueEditorNav />
          <VenueDetailsSection
            control={control}
            onPick={picker.pickImage}
            categoryLimit={config.category_limit}
            minCategories={minCategories}
            venueId={venueId}
            videoLimit={config.venue_video_limit}
          />
          <TypeCapacitySection control={control} setValue={setValue} config={config} />
          <FoodSection
            control={control}
            config={config}
            venueId={venueId}
            venueName={venue?.venue_name}
            hasSavedTables={(venue?.food_tables?.length ?? 0) > 0}
          />
          <AmenitiesSection control={control} config={config} />
          <DocumentsSection control={control} config={config} onPick={picker.pickImage} />
          <OwnerSection control={control} setValue={setValue} isEdit={isEdit} />
          <PayoutSection control={control} />
          <LeavesSection control={control} />
          <OperationsSection control={control} />
          <CancellationSection control={control} />
          <StatusSection control={control} canGovern={canGovern} />
        </EditorPageShell>
      )}
    </QueryGuard>
  );
}
