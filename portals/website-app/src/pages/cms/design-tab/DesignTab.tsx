import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Paper, Skeleton } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CMS_SITE_DESIGN, UPDATE_CMS_SITE_DESIGN, type CmsSiteDesignData } from '../queries/sites';
import { cmsErrorMessage } from '../lib/errors';
import { DesignForm, toDesignInput, type DesignFormOutput } from './design-form';

/** The site's own design system — every site has a different one. */
export default function DesignTab({ siteId }: Readonly<{ siteId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<CmsSiteDesignData>(CMS_SITE_DESIGN, { variables: { id: siteId }, fetchPolicy: 'network-only' });
  const [updateDesign] = useMutation(UPDATE_CMS_SITE_DESIGN);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading && !data) return <Skeleton variant="rounded" height={320} />;
  if (error || !data?.cmsSite) return <Alert severity="error">{t('websiteApp.cms.loadFailed')}</Alert>;

  const save = async (values: DesignFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      await updateDesign({ variables: { id: siteId, input: toDesignInput(values) } });
      notifySuccess(t('websiteApp.cms.design.saved'));
    } catch (err) {
      setSaveError(cmsErrorMessage(err, t('websiteApp.cms.design.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <DesignForm
        design={data.cmsSite.design}
        submitting={submitting}
        errorMessage={saveError}
        onSubmit={(values) => {
          save(values).catch(() => setSaveError(t('websiteApp.cms.design.saveFailed')));
        }}
      />
    </Paper>
  );
}
