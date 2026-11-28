import { useQuery } from '@apollo/client/react';
import { Box, Divider, List, ListItem, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatDay, useDateFormat } from '@duncit/app-settings';
import { QueryGuard, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_EVENT_KIND_KEYS, type HrFieldChangeRecord } from '@duncit/utils';
import { HR_EMPLOYEE_HISTORY, type HistoryData } from '../../../../lib/employee-queries';
import { HISTORY_FIELD_KEYS } from './history-labels';

/** One moved field: its label, then old and new. Secrets arrive as "updated" from the server, never their values. */
function ChangeLine({ change }: Readonly<{ change: HrFieldChangeRecord }>) {
  const { t } = useTranslation();
  const key = HISTORY_FIELD_KEYS[change.field];
  const label = key ? t(key) : change.field;
  const empty = t('hrEmployee.profile.notSet');
  return (
    <Typography variant="body2" component="li" sx={{ ml: 2 }}>
      <strong>{label}</strong>: {change.from ?? empty} <ArrowForwardIcon fontSize="inherit" aria-hidden sx={{ verticalAlign: 'middle' }} /> {change.to ?? empty}
    </Typography>
  );
}

/** The worker history, newest first: hires, job and pay changes, bank updates and reveals, exits and rehires. */
export default function HistoryTab({ employeeId }: Readonly<{ employeeId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error } = useQuery<HistoryData>(HR_EMPLOYEE_HISTORY, { variables: { id: employeeId }, fetchPolicy: 'cache-and-network' });
  const events = data?.hrEmployeeHistory ?? [];

  return (
    <SectionCard title={t('hrEmployee.profile.tab.history')}>
      <QueryGuard loading={loading && !data} error={data ? undefined : error} errorText={t('hrEmployee.toast.loadFailed')}>
        {events.length === 0 ? (
          <Typography variant="body2">{t('hrEmployee.profile.historyEmpty')}</Typography>
        ) : (
          <List disablePadding data-testid="hr-history">
            {events.map((event, index) => (
              <Box key={event.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem disableGutters sx={{ display: 'block', py: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">{t(HR_EVENT_KIND_KEYS[event.kind])}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('hrEmployee.profile.historyBy', { vars: { name: event.actor.name, when: formatDateTime(event.created_at) } })}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('hrEmployee.profile.historyEffective', { vars: { date: formatDay(event.effective_date) } })}
                  </Typography>
                  {event.changes.length > 0 && (
                    <Box component="ul" sx={{ m: 0, mt: 0.5, p: 0 }}>
                      {event.changes.map((change) => (
                        <ChangeLine key={change.field} change={change} />
                      ))}
                    </Box>
                  )}
                  {event.note && <Typography variant="body2" sx={{ mt: 0.5 }}>{event.note}</Typography>}
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </QueryGuard>
    </SectionCard>
  );
}
