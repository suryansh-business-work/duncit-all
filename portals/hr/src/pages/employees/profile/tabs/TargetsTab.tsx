import { useQuery } from '@apollo/client/react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import { QueryGuard, SectionCard, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { EMPLOYEE_TARGET_STATUS_COLORS, EMPLOYEE_TARGET_STATUS_KEYS, formatMonthKey } from '@duncit/utils';
import { HR_EMPLOYEE_TARGETS, type TargetsData } from '../../../../lib/employee-queries';

interface Props {
  employeeId: string;
  /** The Targets console page where these targets are set and reviewed. */
  consoleUrl: string | null;
}

/**
 * The person's monthly targets from the Targets console, newest month first —
 * read-only here; they are assigned and reviewed in Targets.
 */
export default function TargetsTab({ employeeId, consoleUrl }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { data, loading, error } = useQuery<TargetsData>(HR_EMPLOYEE_TARGETS, { variables: { id: employeeId }, fetchPolicy: 'cache-and-network' });
  const targets = data?.hrEmployeeTargets ?? [];

  return (
    <SectionCard
      title={t('hrEmployee.profile.targetsTitle')}
      subtitle={t('hrEmployee.profile.targetsHint')}
      action={
        consoleUrl && (
          <DuncitButton href={consoleUrl} target="_blank" rel="noopener noreferrer" endIcon={<OpenInNewIcon />} data-testid="hr-open-targets">
            {t('hrEmployee.profile.openTargets')}
          </DuncitButton>
        )
      }
    >
      <QueryGuard loading={loading && !data} error={data ? undefined : error} errorText={t('hrEmployee.toast.loadFailed')}>
        {targets.length === 0 ? (
          <Typography variant="body2">{t('hrEmployee.profile.targetsEmpty')}</Typography>
        ) : (
          <Table size="small" aria-label={t('hrEmployee.profile.targetsTitle')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('employeeTargets.col.month')}</TableCell>
                <TableCell>{t('employeeTargets.col.status')}</TableCell>
                <TableCell align="right">{t('employeeTargets.col.goals')}</TableCell>
                <TableCell align="right">{t('employeeTargets.col.completion')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {targets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell>{formatMonthKey(target.month, locale)}</TableCell>
                  <TableCell>
                    <StatusChip status={target.status} colorMap={EMPLOYEE_TARGET_STATUS_COLORS} label={t(EMPLOYEE_TARGET_STATUS_KEYS[target.status])} />
                  </TableCell>
                  <TableCell align="right">{target.goal_count}</TableCell>
                  <TableCell align="right">
                    {target.submission ? t('employeeTargets.submission.percent', { vars: { percent: target.submission.completion_percent } }) : EM_DASH}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryGuard>
    </SectionCard>
  );
}
