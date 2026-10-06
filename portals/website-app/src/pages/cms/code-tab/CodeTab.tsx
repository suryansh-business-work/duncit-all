import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Paper, Skeleton } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CMS_SITE_DESIGN, UPDATE_CMS_SITE_CODE, type CmsSiteDesignData } from '../queries/sites';
import { cmsErrorMessage } from '../lib/errors';
import { CodeForm, toCodeInput, type CodeFormOutput } from './code-form';

/** Site-wide custom code. Server-gated to website managers, like the page itself. */
export default function CodeTab({ siteId }: Readonly<{ siteId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<CmsSiteDesignData>(CMS_SITE_DESIGN, { variables: { id: siteId }, fetchPolicy: 'network-only' });
  const [updateCode] = useMutation(UPDATE_CMS_SITE_CODE);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading && !data) return <Skeleton variant="rounded" height={320} />;
  if (error || !data?.cmsSite) return <Alert severity="error">{t('websiteApp.cms.loadFailed')}</Alert>;

  const save = async (values: CodeFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      await updateCode({ variables: { id: siteId, input: toCodeInput(values) } });
      notifySuccess(t('websiteApp.cms.code.saved'));
    } catch (err) {
      setSaveError(cmsErrorMessage(err, t('websiteApp.cms.code.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <CodeForm
        key={data.cmsSite.updated_at}
        site={data.cmsSite}
        submitting={submitting}
        errorMessage={saveError}
        onSubmit={(values) => {
          save(values).catch(() => setSaveError(t('websiteApp.cms.code.saveFailed')));
        }}
      />
    </Paper>
  );
}
