import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { PageHeader, QueryGuard, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_SETTINGS, type SettingsData } from '../../../lib/settings-queries';
import { HIRE_HR_EMPLOYEE, HR_EMPLOYEES_TABLE, HR_UNRECORDED_EMPLOYEES, type HireData, type HireVars } from '../../../lib/employee-queries';
import { useHrWrite } from '../../../lib/useHrWrite';
import { HireEmployeeForm, type HireOutput, type PresetAccount } from './hire-employee';

type Attempt = { key: string; id: string } | null;

/** The request id for this attempt: the same while the hire is the same, new once anything in it changes. */
function requestIdFor(attempt: { current: Attempt }, key: string): string {
  if (attempt.current?.key !== key) attempt.current = { key, id: crypto.randomUUID() };
  return attempt.current.id;
}

const presetFrom = (state: unknown): PresetAccount | null => {
  const account = (state as { account?: PresetAccount } | null)?.account;
  return account?.id ? { id: account.id, name: account.name, email: account.email ?? null } : null;
};

/** HR > Employees > Add employee. */
export default function HireEmployeePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const attempt = useRef<Attempt>(null);
  const { data, loading, error } = useQuery<SettingsData>(HR_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [hire] = useMutation<HireData, HireVars>(HIRE_HR_EMPLOYEE, { refetchQueries: [HR_EMPLOYEES_TABLE, HR_UNRECORDED_EMPLOYEES] });
  const write = useHrWrite();

  const submit = async (values: HireOutput) => {
    const client_request_id = requestIdFor(attempt, JSON.stringify(values));
    const profile = await write('hireHrEmployee', async () => (await hire({ variables: { input: { ...values, client_request_id } } })).data?.hireHrEmployee, 'hrEmployee.toast.hired');
    if (profile) navigate(`/employees/${profile.employee.id}`, { replace: true });
    return profile !== null;
  };

  return (
    <Stack spacing={3}>
      <PageHeader title={t('hrEmployee.hire.title')} subtitle={t('hrEmployee.hire.subtitle')} />
      <QueryGuard loading={loading && !data} error={data ? undefined : error} errorText={t('hrEmployee.settings.loadFailed')}>
        {data && (
          <SectionCard title={t('hrEmployee.hire.title')}>
            <HireEmployeeForm settings={data.hrSettings} preset={presetFrom(location.state)} onSubmit={submit} onCancel={() => navigate('/employees')} />
          </SectionCard>
        )}
      </QueryGuard>
    </Stack>
  );
}
