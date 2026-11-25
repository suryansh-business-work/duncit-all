import { Card, Chip, Stack, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from '@duncit/shell';
import type { CrmActivity } from '../../api/crm.types';
import { CRM_LOG_HISTORY_VIEW } from '@duncit/utils';
import { formatLogTimestamp } from './logUtils';
import { PersonLink } from './PersonLink';
import type { LogPeople } from './types';

interface Props {
  entries: CrmActivity[];
  people: LogPeople;
}

/** Log activity: one row per Created / Updated / Deleted change, newest first. */
export function LogHistory({ entries, people }: Readonly<Props>) {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <Card variant="outlined" sx={{ p: 1.5 }} data-testid="manual-log-history">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <HistoryIcon color="primary" fontSize="small" aria-hidden />
        <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('crm.manualLogs.historyTitle')}
        </Typography>
      </Stack>
      <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {entries.map((entry, index) => {
          const kind = CRM_LOG_HISTORY_VIEW[entry.type];
          if (!kind) return null;
          return (
            <Stack
              component="li"
              key={`${entry.type}-${entry.target ?? ''}-${entry.created_at ?? index}`}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
            >
              <Chip size="small" variant="outlined" color={kind.tone} label={t(kind.labelKey)} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {entry.created_by ? <PersonLink userId={entry.created_by} people={people} /> : t('crm.people.unknown')}
                {' · '}
                {formatLogTimestamp(entry.created_at)}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );
}
