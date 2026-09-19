import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { GoogleAnalyticsSite, GoogleAnalyticsSiteInput, TrackedWebsite } from '@duncit/gql-types';
import { blankTag, toForm, type GoogleAnalyticsSiteForm } from './google-analytics-site';
import { SITE_LABEL_KEYS } from './google-analytics-copy';
import { DELETE_GOOGLE_ANALYTICS_SITE, GOOGLE_ANALYTICS_SITES, SAVE_GOOGLE_ANALYTICS_SITE } from './queries';

/** What the open dialog edits: the websites its picker offers and the values it starts from. */
export interface TagDialogState {
  siteOptions: TrackedWebsite[];
  lockSite: boolean;
  initial: GoogleAnalyticsSiteForm;
}

/** Every write re-reads the list, so the table shows what the server now holds. */
const REFETCH = { refetchQueries: [GOOGLE_ANALYTICS_SITES], awaitRefetchQueries: true };

/** Add, edit and remove for the website tags, and the dialog state around them. */
export function useGoogleAnalyticsActions(sites: readonly GoogleAnalyticsSite[]) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [saveTag] = useMutation(SAVE_GOOGLE_ANALYTICS_SITE, REFETCH);
  const [deleteTag] = useMutation(DELETE_GOOGLE_ANALYTICS_SITE, REFETCH);

  const [dialog, setDialog] = useState<TagDialogState | null>(null);
  const [saving, setSaving] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  // "Add" picks among the websites that have no tag yet.
  const untagged = sites.filter((row) => !row.measurement_id).map((row) => row.site);

  const openCreate = () => {
    const [first] = untagged;
    if (!first) return;
    setOpError(null);
    setDialog({ siteOptions: untagged, lockSite: false, initial: blankTag(first) });
  };

  const openEdit = useCallback((row: GoogleAnalyticsSite) => {
    setOpError(null);
    setDialog({ siteOptions: [row.site], lockSite: true, initial: toForm(row) });
  }, []);

  const close = useCallback(() => setDialog(null), []);

  const submit = async (input: GoogleAnalyticsSiteInput) => {
    setSaving(true);
    setOpError(null);
    try {
      await saveTag({ variables: { input } });
      setDialog(null);
      notifySuccess(t('shell.common.saved'));
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('tech.googleAnalytics.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = useCallback(
    async (row: GoogleAnalyticsSite) => {
      const ok = await confirm({
        title: t('tech.googleAnalytics.removeTag'),
        message: t('tech.googleAnalytics.removeConfirm', {
          vars: { id: row.measurement_id ?? '', website: t(SITE_LABEL_KEYS[row.site]) },
        }),
        destructive: true,
        confirmLabel: t('tech.googleAnalytics.removeTag'),
      });
      if (!ok) return;
      try {
        await deleteTag({ variables: { site: row.site } });
        notifySuccess(t('shell.common.deleted'));
      } catch (e) {
        notifyError(e instanceof Error ? e.message : t('tech.googleAnalytics.removeFailed'));
      }
    },
    [confirm, deleteTag, t],
  );

  return { dialog, saving, opError, canAdd: untagged.length > 0, openCreate, openEdit, close, submit, remove };
}
