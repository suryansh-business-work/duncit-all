import { Link as RouterLink } from 'react-router';
import { Box, Link } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { InfoRow, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYMENT_TYPE_KEYS, type HrEmployeeRecord } from '@duncit/utils';

/** The job as it stands today; changes are recorded with Change job and kept in History. */
export default function JobTab({ employee }: Readonly<{ employee: HrEmployeeRecord }>) {
  const { t } = useTranslation();
  const job = employee.job;
  const notSet = t('hrEmployee.profile.notSet');
  return (
    <SectionCard title={t('hrEmployee.profile.tab.job')}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        <InfoRow label={t('hrEmployee.field.employeeCode')} value={employee.employee_code} />
        <InfoRow label={t('hrEmployee.field.jobTitle')} value={job.job_title} />
        <InfoRow label={t('hrEmployee.field.employmentType')} value={t(HR_EMPLOYMENT_TYPE_KEYS[job.employment_type])} />
        <InfoRow label={t('hrEmployee.field.department')} value={job.department ?? notSet} />
        <InfoRow label={t('hrEmployee.field.workLocation')} value={job.work_location ?? notSet} />
        <InfoRow
          label={t('hrEmployee.field.manager')}
          value={job.manager ? <Link component={RouterLink} to={`/employees/${job.manager.id}`}>{`${job.manager.name} · ${job.manager.employee_code}`}</Link> : notSet}
        />
        <InfoRow label={t('hrEmployee.field.dateOfJoining')} value={formatDay(job.date_of_joining)} />
        <InfoRow label={t('hrEmployee.field.probationEnd')} value={job.probation_end_date ? formatDay(job.probation_end_date) : notSet} />
        <InfoRow label={t('hrEmployee.field.noticeDays')} value={String(job.notice_period_days)} />
        <InfoRow label={t('hrEmployee.field.workEmail')} value={job.work_email ?? notSet} />
      </Box>
    </SectionCard>
  );
}
