import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, List, ListItem, ListItemText, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard, SectionCard, StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_STATS, HR_UNRECORDED_EMPLOYEES, type StatsData, type UnrecordedData } from '../../lib/employee-queries';

/** The HR home's head counts: active, on notice, joiners and leavers this month, and the department split. */
export default function HrOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<StatsData>(HR_EMPLOYEE_STATS, { fetchPolicy: 'cache-and-network' });
  const { data: gaps } = useQuery<UnrecordedData>(HR_UNRECORDED_EMPLOYEES, { fetchPolicy: 'cache-and-network' });
  const stats = data?.hrEmployeeStats;
  const unrecorded = gaps?.hrUnrecordedEmployees.length ?? 0;

  return (
    <QueryGuard loading={loading && !stats} error={stats ? undefined : error} errorText={t('hrEmployee.dashboard.loadFailed')}>
      {stats && (
        <Box sx={{ display: 'grid', gap: 2 }} data-testid="hr-overview">
          {unrecorded > 0 && (
            <Alert
              severity="warning"
              action={
                <DuncitButton color="inherit" size="small" onClick={() => navigate('/employees')}>
                  {t('hrEmployee.dashboard.review')}
                </DuncitButton>
              }
            >
              {t('hrEmployee.dashboard.unrecorded', { vars: { count: unrecorded } })}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            <StatCard label={t('hrEmployee.dashboard.active')} value={stats.active} icon={<GroupsIcon />} />
            <StatCard label={t('hrEmployee.dashboard.onNotice')} value={stats.on_notice} icon={<HourglassBottomIcon />} />
            <StatCard label={t('hrEmployee.dashboard.joined')} value={stats.joined_this_month} icon={<PersonAddIcon />} />
            <StatCard label={t('hrEmployee.dashboard.exited')} value={stats.exited_this_month} icon={<PersonRemoveIcon />} />
          </Box>
          {stats.by_department.length > 0 && (
            <SectionCard title={t('hrEmployee.dashboard.byDepartment')}>
              <List dense disablePadding>
                {stats.by_department.map((row) => (
                  <ListItem key={row.department ?? 'none'} disableGutters secondaryAction={<Typography variant="subtitle2">{row.count}</Typography>}>
                    <ListItemText primary={row.department ?? t('hrEmployee.dashboard.noDepartment')} />
                  </ListItem>
                ))}
              </List>
            </SectionCard>
          )}
        </Box>
      )}
    </QueryGuard>
  );
}
