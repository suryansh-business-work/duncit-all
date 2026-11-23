import { Box, Card, Stack, Typography } from '@mui/material';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CrmActivity } from '../../api/crm.types';
import { logKey } from './logUtils';
import { ManualLogCard } from './ManualLogCard';
import type { LogPeople } from './types';

interface Props {
  groups: Array<[string, CrmActivity[]]>;
  people: LogPeople;
  canChange: (log: CrmActivity) => boolean;
  onEdit: (log: CrmActivity) => void;
  onDelete: (log: CrmActivity) => void;
}

export function ManualLogList({ groups, people, canChange, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  if (groups.length === 0)
    return (
      <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.manualLogs.empty')}
        </Typography>
      </Card>
    );
  return (
    <Stack spacing={2}>
      {groups.map(([day, entries]) => (
        <Box key={day}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.4, textTransform: 'uppercase' }}
          >
            {formatDate(day)} · {t('crm.manualLogs.count', { count: entries.length })}
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {entries.map((log) => (
              <ManualLogCard
                key={logKey(log)}
                log={log}
                people={people}
                canChange={canChange(log)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
