import { Text, YStack } from 'tamagui';
import { formatDate } from '@duncit/datetime';
import { crmLogKey } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { useTranslation } from '@/hooks/useTranslation';
import { ManualLogsCard } from './ManualLogsCard';
import type { LogPeople } from './ManualLogsPeople';
import type { LogActivity } from './ManualLogsState';

interface Props {
  groups: readonly [string, LogActivity[]][];
  people: LogPeople;
  onEdit: (log: LogActivity) => void;
  onDelete: (log: LogActivity) => void;
}

/** A local day key (YYYY-MM-DD) in the platform's date format. */
function dayLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return formatDate(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

/** The logs grouped by day, newest first, each day headed by its date and count. */
export function ManualLogsList({ groups, people, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  if (groups.length === 0) {
    return (
      <YStack {...SURFACE} padding="$4" alignItems="center">
        <Text color="$muted" textAlign="center">
          {t('crm.manualLogs.empty')}
        </Text>
      </YStack>
    );
  }
  return (
    <YStack gap="$3">
      {groups.map(([day, entries]) => (
        <YStack key={day} gap="$2">
          <Text
            color="$muted"
            fontSize="$2"
            fontWeight="700"
            textTransform="uppercase"
            role="heading"
          >
            {`${dayLabel(day)} · ${t('crm.manualLogs.count', { count: entries.length })}`}
          </Text>
          {entries.map((log) => (
            <ManualLogsCard
              key={crmLogKey(log)}
              log={log}
              people={people}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </YStack>
      ))}
    </YStack>
  );
}
