import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, LinearProgress } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CMS_FRAGMENT_DRAFT, SAVE_CMS_FRAGMENT_DRAFT, type CmsFragmentDraftData, type CmsFragmentRow } from '../queries/fragments';
import { useSiteTokens } from '../lib/useSiteTokens';
import { cmsErrorMessage } from '../lib/errors';
import { ComponentCodeForm, toComponentCodeValues, toDraftInput, type ComponentCodeOutput } from './component-code-form';

type Loaded = NonNullable<CmsFragmentDraftData['cmsFragment']>;

interface Props {
  siteId: string;
  component: CmsFragmentRow | null;
  onClose: () => void;
  onSaved: () => void;
}

/** A component's code — markup, SCSS and JS — saved into its draft; publish makes it live. */
export default function ComponentCodeDialog({ siteId, component, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const tokens = useSiteTokens(siteId);
  const { data, loading, error } = useQuery<CmsFragmentDraftData>(CMS_FRAGMENT_DRAFT, {
    variables: { id: component?.id },
    skip: !component,
    fetchPolicy: 'network-only',
  });
  const [saveDraft] = useMutation(SAVE_CMS_FRAGMENT_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loaded = data?.cmsFragment;

  const save = async (values: ComponentCodeOutput, current: Loaded) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      await saveDraft({ variables: { id: current.id, input: toDraftInput(values, current.draft, current.updated_at) } });
      notifySuccess(t('websiteApp.cms.componentCode.saved'));
      onSaved();
      onClose();
    } catch (failure) {
      setSaveError(cmsErrorMessage(failure, t('websiteApp.cms.componentCode.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(component)} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>{t('websiteApp.cms.componentCode.title', { vars: { name: component?.name ?? '' } })}</DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress aria-label={t('websiteApp.cms.componentCode.loading')} />}
        {error && <Alert severity="error">{t('websiteApp.cms.componentCode.loadFailed')}</Alert>}
        {loaded && (
          <ComponentCodeForm
            key={loaded.updated_at}
            values={toComponentCodeValues(loaded.draft)}
            tokens={tokens}
            submitting={submitting}
            errorMessage={saveError}
            onCancel={onClose}
            onSubmit={(values) => {
              save(values, loaded).catch(() => setSaveError(t('websiteApp.cms.componentCode.saveFailed')));
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
