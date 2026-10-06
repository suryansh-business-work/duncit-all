import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { CmsCollection } from '@duncit/gql-types';
import { CREATE_CMS_PAGE, UPDATE_CMS_PAGE, type CmsPageRow } from '../queries/pages';
import { cmsErrorMessage } from '../lib/errors';
import { PageForm, toPageInput, type PageFormOutput, type PagePreset } from './page-form';
import { useSiteTokens } from '../lib/useSiteTokens';

interface Props {
  siteId: string;
  collections: CmsCollection[];
  /** null: closed. `{ page: null }`: a new page. */
  state: { page: CmsPageRow | null; preset?: PagePreset } | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Creates a page, or edits one's settings (not its design). */
export default function PageSettingsDialog({ siteId, collections, state, onClose, onSaved }: Readonly<Props>) {
  const tokens = useSiteTokens(siteId);
  const { t } = useTranslation();
  const [createPage] = useMutation(CREATE_CMS_PAGE);
  const [updatePage] = useMutation(UPDATE_CMS_PAGE);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const page = state?.page ?? null;

  const save = async (values: PageFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      const input = toPageInput(values);
      if (page) await updatePage({ variables: { id: page.id, input } });
      else await createPage({ variables: { siteId, input } });
      onSaved();
      onClose();
    } catch (error) {
      setSaveError(cmsErrorMessage(error, t('websiteApp.cms.pageForm.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(state)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{page ? t('websiteApp.cms.pageForm.dialogEdit') : t('websiteApp.cms.pageForm.dialogNew')}</DialogTitle>
      <DialogContent dividers>
        {state && (
          <PageForm
            key={page?.id ?? state.preset?.path ?? 'new'}
            page={page}
            preset={state?.preset ?? null}
            tokens={tokens}
            collections={collections}
            submitting={submitting}
            errorMessage={saveError}
            onSubmit={(values) => {
              save(values).catch(() => setSaveError(t('websiteApp.cms.pageForm.saveFailed')));
            }}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
