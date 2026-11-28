import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Stack } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { PageHeader, QueryGuard, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { firstGraphQLError } from '@duncit/utils';
import { MY_HR_PROFILE, UPDATE_MY_HR_CONTACT, type MyHrProfileData, type UpdateMyContactData, type UpdateMyContactVars } from './queries';
import { MyBankCard, MyJobCard, MyPayCard } from './MyRecordCards';
import { MyContactForm, type MyContactOutput } from './contact-form';

/** Employee console > My HR record: my job, pay and bank details as HR holds them, and my own contact details. */
export default function MyHrRecordPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<MyHrProfileData>(MY_HR_PROFILE, { fetchPolicy: 'cache-and-network' });
  const [save] = useMutation<UpdateMyContactData, UpdateMyContactVars>(UPDATE_MY_HR_CONTACT, { refetchQueries: [MY_HR_PROFILE] });
  const record = data?.myHrProfile ?? null;

  const submit = async (input: MyContactOutput) => {
    if (!record) return false;
    try {
      await save({ variables: { input, expectedRevision: record.employee.revision } });
      notifySuccess(t('hrEmployee.self.saved'));
      return true;
    } catch (failure) {
      const graphQLError = firstGraphQLError(failure);
      logs.portal.employee.error('MyHrRecordPage', 'updateMyHrContact', { error: failure, code: graphQLError?.extensions?.code });
      notifyError(graphQLError?.extensions?.code === 'CONFLICT' ? t('hrEmployee.toast.conflict') : (graphQLError?.message ?? t('hrEmployee.toast.failed')));
      return false;
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader title={t('hrEmployee.self.title')} subtitle={t('hrEmployee.self.subtitle')} />
      <QueryGuard loading={loading && !data} error={data ? undefined : error} errorText={t('hrEmployee.toast.loadFailed')}>
        {data && !record && (
          <Alert severity="info" data-testid="my-record-empty">
            <AlertTitle>{t('hrEmployee.self.noRecordTitle')}</AlertTitle>
            {t('hrEmployee.self.noRecordBody')}
          </Alert>
        )}
        {record && (
          <Stack spacing={3}>
            {record.employee.exit && record.employee.status === 'EXITED' && (
              <Alert severity="warning">{t('hrEmployee.self.exitedNotice', { vars: { date: formatDay(record.employee.exit.last_working_day) } })}</Alert>
            )}
            <MyJobCard employee={record.employee} />
            <MyPayCard pay={record.current_compensation} />
            <SectionCard title={t('hrEmployee.self.contactTitle')} subtitle={t('hrEmployee.self.contactHint')}>
              <MyContactForm personal={record.employee.personal} readOnly={record.employee.status === 'EXITED'} onSubmit={submit} />
            </SectionCard>
            <MyBankCard bank={record.employee.bank} />
          </Stack>
        )}
      </QueryGuard>
    </Stack>
  );
}
