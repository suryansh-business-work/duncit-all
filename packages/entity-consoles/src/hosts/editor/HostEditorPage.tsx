import { useParams } from 'react-router';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import useMediaPicker from '../../shared/useMediaPicker';
import EditorPageShell from '../../shared/EditorPageShell';
import { useRecordParentPath } from '../../shared/recordPaths';
import { useHostEditor } from './useHostEditor';
import IdentitySection from './sections/IdentitySection';
import VerificationSection from './sections/VerificationSection';
import CategoriesSection from './sections/CategoriesSection';
import StatusSection from './sections/StatusSection';

/**
 * `/hosts/new` and `/hosts/:hostId/edit` — the whole host record, editable.
 * The clubs console mounts the editor at `/clubs/:clubId/hosts/:hostId/edit`
 * too, which is why Back is resolved from the path rather than written out.
 *
 * Identity, the verification documents, every category they may run, the payout,
 * the review status and the commission. A page rather than a dialog for the same
 * reason the venue editor is, and behind the same frame — so this file is only
 * which sections a host has.
 */
export default function HostEditorPage() {
  const { t } = useTranslation();
  const { hostId = '' } = useParams<{ hostId: string }>();
  const picker = useMediaPicker('/hosts');
  const editor = useHostEditor(hostId);
  const { form, host, isEdit, canGovern, busy, saveError, submit } = editor;

  const backTo = useRecordParentPath();
  const title = isEdit
    ? host?.full_name || t('directory.hostEditor.editTitle')
    : t('directory.hostEditor.newTitle');
  const eyebrow = isEdit
    ? t('directory.hostEditor.eyebrowEdit')
    : t('directory.hostEditor.eyebrowNew');

  return (
    <QueryGuard
      loading={editor.loading}
      error={editor.error}
      errorText={editor.error?.message}
      notFound={isEdit && !host}
      notFoundText={t('directory.hostEditor.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (
        <EditorPageShell
          eyebrow={eyebrow}
          title={title}
          backTo={backTo}
          saveLabel={t('directory.hostEditor.save')}
          busy={busy}
          error={saveError}
          onSubmit={form.handleSubmit(submit)}
          picker={picker}
        >
          <IdentitySection control={form.control} setValue={form.setValue} isEdit={isEdit} />
          <VerificationSection control={form.control} onPick={picker.pickImage} />
          <CategoriesSection control={form.control} />
          <StatusSection control={form.control} canGovern={canGovern} />
        </EditorPageShell>
      )}
    </QueryGuard>
  );
}
