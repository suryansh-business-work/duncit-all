import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader, QueryGuard } from '@duncit/ui';
import MediaPickerDialog from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import useMediaPicker from '../../shared/useMediaPicker';
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
 * operating rules its bookings are generated from. The record is deep, so the
 * screen is tall and scrolls, and Save is reachable from the header at any
 * depth.
 */
export default function VenueEditorPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const picker = useMediaPicker('/venues');
  const editor = useVenueEditor(venueId);
  const { form, config, venue, isEdit, busy, saveError, submit } = editor;

  const backTo = isEdit && venueId ? `/venues/${venueId}` : '/venues';
  const title = isEdit
    ? venue?.venue_name || t('directory.venueEditor.editTitle')
    : t('directory.venueEditor.newTitle');

  return (
    <>
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
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <Stack spacing={2.5}>
              <BackHeader
                backTo={backTo}
                backAriaLabel={t('directory.venueEditor.backAria')}
                backSx={{ bgcolor: 'action.hover' }}
                eyebrow={
                  isEdit
                    ? t('directory.venueEditor.eyebrowEdit')
                    : t('directory.venueEditor.eyebrowNew')
                }
                title={title}
                titleWeight={950}
                titleSx={{ lineHeight: 1.1 }}
                actions={
                  <DuncitButton
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    loading={busy}
                  >
                    {t('directory.venueEditor.save')}
                  </DuncitButton>
                }
              />

              {saveError && <Alert severity="error">{saveError}</Alert>}

              <BasicsSection control={form.control} config={config} />
              <LocationSection control={form.control} />
              <MediaSection control={form.control} onPick={picker.pickImage} />
              <DocumentsSection control={form.control} config={config} onPick={picker.pickImage} />
              <OwnerSection control={form.control} setValue={form.setValue} isEdit={isEdit} />
              <OperationsSection control={form.control} />
              <CancellationSection control={form.control} />
              <StatusSection control={form.control} />

              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <DuncitButton onClick={() => navigate(backTo)} disabled={busy}>
                  {t('directory.venueEditor.cancel')}
                </DuncitButton>
                <DuncitButton
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  loading={busy}
                >
                  {t('directory.venueEditor.save')}
                </DuncitButton>
              </Stack>
            </Stack>
          </form>
        )}
      </QueryGuard>

      <MediaPickerDialog
        open={picker.open}
        onClose={() => picker.settle(null)}
        onPicked={(url) => picker.settle(url)}
        folder={picker.folder}
        title={t('directory.venueEditor.pickMedia')}
      />
    </>
  );
}
