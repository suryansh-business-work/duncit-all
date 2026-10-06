import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { Editor } from 'grapesjs';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { PUBLISH_CMS_PAGE, SAVE_CMS_PAGE_DRAFT } from '../queries/pages';
import { PUBLISH_CMS_FRAGMENT, SAVE_CMS_FRAGMENT_DRAFT } from '../queries/fragments';
import { cmsErrorMessage, isConflict } from '../lib/errors';
import { snapshot } from './useGrapesEditor';

export type EditorTarget = 'pages' | 'fragments';

interface SaveResult {
  updated_at: string;
}

/**
 * Save draft and publish for whichever document the editor has open. Every
 * save carries the `updated_at` it loaded, so a save after someone else's is
 * refused instead of silently throwing their work away.
 */
export function useEditorSave(target: EditorTarget, id: string, loadedAt: string | null, markSaved: () => void) {
  const { t } = useTranslation();
  const baseRef = useRef(loadedAt);
  baseRef.current ??= loadedAt;
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);
  const [conflict, setConflict] = useState(false);
  const [savePage] = useMutation<{ saveCmsPageDraft: SaveResult }>(SAVE_CMS_PAGE_DRAFT);
  const [saveFragment] = useMutation<{ saveCmsFragmentDraft: SaveResult }>(SAVE_CMS_FRAGMENT_DRAFT);
  const [publishPage] = useMutation<{ publishCmsPage: SaveResult }>(PUBLISH_CMS_PAGE);
  const [publishFragment] = useMutation<{ publishCmsFragment: SaveResult }>(PUBLISH_CMS_FRAGMENT);

  const saveDraft = useCallback(
    async (editor: Editor): Promise<boolean> => {
      const input = { ...snapshot(editor), base_updated_at: baseRef.current };
      try {
        const result =
          target === 'pages'
            ? (await savePage({ variables: { id, input } })).data?.saveCmsPageDraft
            : (await saveFragment({ variables: { id, input } })).data?.saveCmsFragmentDraft;
        if (result) baseRef.current = result.updated_at;
        markSaved();
        return true;
      } catch (error) {
        if (isConflict(error)) setConflict(true);
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.editor.saveFailed')));
        return false;
      }
    },
    [id, markSaved, saveFragment, savePage, t, target],
  );

  const save = useCallback(
    async (editor: Editor) => {
      setBusy('save');
      try {
        if (await saveDraft(editor)) notifySuccess(t('websiteApp.cms.editor.saved'));
      } finally {
        setBusy(null);
      }
    },
    [saveDraft, t],
  );

  /** Publishing always saves first — what goes live is what is on screen. */
  const publish = useCallback(
    async (editor: Editor) => {
      setBusy('publish');
      try {
        if (!(await saveDraft(editor))) return;
        const updatedAt =
          target === 'pages'
            ? (await publishPage({ variables: { id } })).data?.publishCmsPage.updated_at
            : (await publishFragment({ variables: { id } })).data?.publishCmsFragment.updated_at;
        if (updatedAt) baseRef.current = updatedAt;
        notifySuccess(t('websiteApp.cms.pages.publishedToast'));
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.pages.publishFailed')));
      } finally {
        setBusy(null);
      }
    },
    [id, publishFragment, publishPage, saveDraft, t, target],
  );

  return { save, publish, busy, conflict };
}
