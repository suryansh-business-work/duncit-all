import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { QueryGuard } from '@duncit/ui';
import { MANUAL_TEST_CASE, type CaseData, type CaseVariables } from '../shared/case.queries';
import { manualErrorText } from '../shared/errors';
import CaseLayout from './CaseLayout';

const WHERE = { page: '/manual/cases/:caseKey', component: 'ManualCaseDetailPage' };

/** Manual Testing > Cases > QA-12 — one case, Jira-style, at the address people paste. */
export default function ManualCaseDetailPage() {
  const { t } = useTranslation();
  const { caseKey = '' } = useParams();
  const { data, loading, error, refetch } = useQuery<CaseData, CaseVariables>(MANUAL_TEST_CASE, {
    variables: { key: caseKey },
    fetchPolicy: 'cache-and-network',
  });
  const record = data?.manualTestCase ?? null;
  const retry = () => {
    refetch().catch((err: unknown) =>
      notifyError(manualErrorText(t, err, t('testsManual.detail.refreshFailed'), WHERE))
    );
  };

  return (
    <>
      {data && error ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <DuncitButton color="inherit" size="small" onClick={retry}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {t('testsManual.detail.refreshFailed')}
        </Alert>
      ) : null}
      <QueryGuard
        loading={loading && !data}
        error={data ? undefined : error}
        notFound={Boolean(data) && !record}
        notFoundText={t('testsManual.detail.notFound', { vars: { key: caseKey } })}
        loadingLabel={t('testsManual.detail.loading')}
      >
        {() => (record ? <CaseLayout record={record} /> : null)}
      </QueryGuard>
    </>
  );
}
