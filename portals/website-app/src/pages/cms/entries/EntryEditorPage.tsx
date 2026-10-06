import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { TAB_PARAM } from '@duncit/tabs';
import { useSetBreadcrumbs, useTranslation } from '@duncit/shell';
import { CMS_ENTRY, CREATE_CMS_ENTRY, UPDATE_CMS_ENTRY, type CmsEntryData } from '../queries/entries';
import { CMS_COLLECTIONS, COLLECTION_SLUG, useCmsLabels } from '../lib/labels';
import { cmsErrorMessage } from '../lib/errors';
import { EntryForm, toEntryInput, type EntryFormOutput } from './entry-form';

/** Writes or edits one entry of a site's collection, full page. */
export default function EntryEditorPage() {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const navigate = useNavigate();
  const { siteId = '', collectionSlug = '', entryId = 'new' } = useParams();
  const collection = CMS_COLLECTIONS.find((c) => COLLECTION_SLUG[c] === collectionSlug) ?? null;
  const isNew = entryId === 'new';
  const { data, loading, error } = useQuery<CmsEntryData>(CMS_ENTRY, { variables: { id: entryId }, skip: isNew, fetchPolicy: 'network-only' });
  const [createEntry] = useMutation<{ createCmsEntry: { id: string } }>(CREATE_CMS_ENTRY);
  const [updateEntry] = useMutation(UPDATE_CMS_ENTRY);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const backTo = `/sites/${siteId}?${TAB_PARAM}=${collectionSlug}`;
  const entryTitle = isNew ? t('websiteApp.cms.entryForm.titleNew') : (data?.cmsEntry?.title ?? '');
  useSetBreadcrumbs(collection ? [{ label: labels.collection[collection], to: backTo }, { label: entryTitle }] : null);

  if (!collection) return <Alert severity="warning">{t('websiteApp.cms.notFound')}</Alert>;
  if (!isNew && loading) return <Skeleton variant="rounded" height={480} />;
  if (!isNew && (error || !data?.cmsEntry)) return <Alert severity="error">{t('websiteApp.cms.entryForm.loadFailed')}</Alert>;

  const save = async (values: EntryFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      const input = toEntryInput(values, collection);
      if (isNew) await createEntry({ variables: { siteId, input } });
      else await updateEntry({ variables: { id: entryId, input } });
      notifySuccess(t('websiteApp.cms.entryForm.saved'));
      navigate(backTo);
    } catch (err) {
      setSaveError(cmsErrorMessage(err, t('websiteApp.cms.entryForm.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const label = labels.collection[collection];
  return (
    <Stack spacing={2}>
      <PageHeader title={isNew ? t('websiteApp.cms.entryForm.titleNew') : t('websiteApp.cms.entryForm.titleEdit')} subtitle={label} titleWeight={700} />
      <EntryForm
        entry={isNew ? null : (data?.cmsEntry ?? null)}
        aiContext={`Duncit website ${label}`}
        submitting={submitting}
        errorMessage={saveError}
        onSubmit={(values) => {
          save(values).catch(() => setSaveError(t('websiteApp.cms.entryForm.saveFailed')));
        }}
      />
    </Stack>
  );
}
