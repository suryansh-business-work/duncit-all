import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DUPLICATE_CMS_PAGE, type CmsPageRow } from '../queries/pages';
import { cmsErrorMessage } from '../lib/errors';
import { DuplicateForm, toDuplicateValues, type DuplicateFormOutput } from './duplicate-form';

interface Props {
  page: CmsPageRow | null;
  onClose: () => void;
  onDuplicated: () => void;
}

/** Copies a page's design to a new, unpublished page at another address. */
export default function DuplicateDialog({ page, onClose, onDuplicated }: Readonly<Props>) {
  const { t } = useTranslation();
  const [duplicatePage] = useMutation(DUPLICATE_CMS_PAGE);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async (values: DuplicateFormOutput) => {
    if (!page) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      await duplicatePage({ variables: { id: page.id, title: values.title, path: values.path } });
      onDuplicated();
      onClose();
    } catch (error) {
      setSaveError(cmsErrorMessage(error, t('websiteApp.cms.pages.duplicateFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(page)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('websiteApp.cms.pages.duplicateTitle')}</DialogTitle>
      <DialogContent dividers>
        {page && (
          <DuplicateForm
            key={page.id}
            defaultValues={toDuplicateValues(t('websiteApp.cms.pages.copyOf', { vars: { title: page.title } }), page.path)}
            submitting={submitting}
            errorMessage={saveError}
            onSubmit={(values) => {
              save(values).catch(() => setSaveError(t('websiteApp.cms.pages.duplicateFailed')));
            }}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
