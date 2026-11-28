import { Link as RouterLink } from 'react-router';
import { Box, Link, List, ListItem, ListItemText, Typography } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { InfoRow, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_EXIT_TYPE_KEYS, HR_GENDER_KEYS } from '@duncit/utils';
import type { HrProfile } from '../../../../lib/employee-queries';

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } };

/** Personal and contact details, the emergency contact, an exit if one is recorded, direct reports and org-chart seats. */
export default function OverviewTab({ profile }: Readonly<{ profile: HrProfile }>) {
  const { t } = useTranslation();
  const { employee, direct_reports: reports, seats } = profile;
  const p = employee.personal;
  const notSet = t('hrEmployee.profile.notSet');
  const phone = (ext: string | null, number: string | null) => (number ? `${ext ?? ''} ${number}`.trim() : notSet);
  const e = p.emergency_contact;

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <SectionCard title={t('hrEmployee.profile.personalTitle')}>
        <Box sx={grid}>
          <InfoRow label={t('hrEmployee.field.accountEmail')} value={employee.account_email ?? notSet} />
          <InfoRow label={t('hrEmployee.field.personalEmail')} value={p.personal_email ?? notSet} />
          <InfoRow label={t('hrEmployee.field.phone')} value={phone(p.phone_extension, p.phone_number)} />
          <InfoRow label={t('hrEmployee.field.gender')} value={p.gender ? t(HR_GENDER_KEYS[p.gender]) : notSet} />
          <InfoRow label={t('hrEmployee.field.dateOfBirth')} value={p.date_of_birth ? formatDay(p.date_of_birth) : notSet} />
          <InfoRow label={t('hrEmployee.field.currentAddress')} value={p.current_address ?? notSet} />
          <InfoRow label={t('hrEmployee.field.permanentAddress')} value={p.permanent_address ?? notSet} />
        </Box>
      </SectionCard>
      <SectionCard title={t('hrEmployee.profile.emergencyTitle')}>
        {e ? (
          <Box sx={grid}>
            <InfoRow label={t('hrEmployee.field.emergencyName')} value={e.name} />
            <InfoRow label={t('hrEmployee.field.emergencyRelation')} value={e.relation ?? notSet} />
            <InfoRow label={t('hrEmployee.field.emergencyPhone')} value={phone(e.phone_extension, e.phone_number)} />
          </Box>
        ) : (
          <Typography variant="body2">{t('hrEmployee.profile.noEmergency')}</Typography>
        )}
      </SectionCard>
      {employee.exit && (
        <SectionCard title={t('hrEmployee.profile.exitTitle')}>
          <Box sx={grid}>
            <InfoRow label={t('hrEmployee.field.exitType')} value={t(HR_EXIT_TYPE_KEYS[employee.exit.exit_type])} />
            <InfoRow label={t('hrEmployee.field.lastWorkingDay')} value={formatDay(employee.exit.last_working_day)} />
            <InfoRow label={t('hrEmployee.field.resignationDate')} value={employee.exit.resignation_date ? formatDay(employee.exit.resignation_date) : notSet} />
            <InfoRow label={t('hrEmployee.field.eligibleForRehire')} value={employee.exit.eligible_for_rehire ? t('hrEmployee.profile.rehireYes') : t('hrEmployee.profile.rehireNo')} />
            <InfoRow label={t('hrEmployee.field.exitReason')} value={employee.exit.reason ?? notSet} />
          </Box>
        </SectionCard>
      )}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <SectionCard title={t('hrEmployee.profile.reportsTitle')}>
          {reports.length === 0 ? (
            <Typography variant="body2">{t('hrEmployee.profile.noReports')}</Typography>
          ) : (
            <List dense disablePadding>
              {reports.map((r) => (
                <ListItem key={r.id} disableGutters>
                  <ListItemText primary={<Link component={RouterLink} to={`/employees/${r.id}`}>{r.name}</Link>} secondary={[r.employee_code, r.job_title].filter(Boolean).join(' · ')} />
                </ListItem>
              ))}
            </List>
          )}
        </SectionCard>
        <SectionCard title={t('hrEmployee.profile.seatsTitle')}>
          {seats.length === 0 ? (
            <Typography variant="body2">{t('hrEmployee.profile.noSeats')}</Typography>
          ) : (
            <List dense disablePadding>
              {seats.map((s) => (
                <ListItem key={s.node_id} disableGutters>
                  <ListItemText
                    primary={<Link component={RouterLink} to={`/team-structure/${s.structure_id}`}>{t('hrEmployee.profile.openSeat', { vars: { structure: s.structure_name } })}</Link>}
                    secondary={[s.title, s.department].filter(Boolean).join(' · ')}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
}
