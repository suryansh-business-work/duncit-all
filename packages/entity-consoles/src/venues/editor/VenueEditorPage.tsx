import { useParams } from 'react-router';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import useMediaPicker from '../../shared/useMediaPicker';
import EditorPageShell from '../../shared/EditorPageShell';
import { useVenueEditor } from './useVenueEditor';
import BasicsSection from './sections/BasicsSection';
import LocationSection from './sections/LocationSection';
import MediaSection from './sections/MediaSection';
import DocumentsSection from './sections/DocumentsSection';
import OwnerSection from './sections/OwnerSection';
import OperationsSection from './sections/OperationsSection';
import CancellationSection from './sections/CancellationSection';
import StatusSection from './sections/StatusSection';

/**
 * `/venues/new` and `/venues/:venueId/edit` — the whole venue record, editable.
 *
 * A PAGE rather than a dialog because there is no version of this that fits in
 * a modal: a venue carries eight sections, two cancellation ladders and the
 * operating rules its bookings are generated from. The frame comes from
 * `EditorPageShell`, so this file is only which sections a venue has and in what
 * order.
 */
export default function VenueEditorPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const picker = useMediaPicker('/venues');
  const editor = useVenueEditor(venueId);
  const { form, config, venue, isEdit, canGovern, busy, saveError, submit } = editor;

  const backTo = isEdit && venueId ? `/venues/${venueId}` : '/venues';
  const title = isEdit
    ? venue?.venue_name || t('directory.venueEditor.editTitle')
    : t('directory.venueEditor.newTitle');
  const eyebrow = isEdit
    ? t('directory.venueEditor.eyebrowEdit')
    : t('directory.venueEditor.eyebrowNew');

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
          <BasicsSection control={form.control} config={config} />
          <LocationSection control={form.control} />
          <MediaSection control={form.control} onPick={picker.pickImage} />
          <DocumentsSection control={form.control} config={config} onPick={picker.pickImage} />
          <OwnerSection control={form.control} setValue={form.setValue} isEdit={isEdit} />
          <OperationsSection control={form.control} />
          <CancellationSection control={form.control} />
          <StatusSection control={form.control} canGovern={canGovern} />
        </EditorPageShell>
      )}
    </QueryGuard>
  );
}
