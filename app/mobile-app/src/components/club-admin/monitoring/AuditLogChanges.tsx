import { Text, YStack } from 'tamagui';
import type { PodAuditLog } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  log: PodAuditLog;
  testID: string;
}

/** The tracked fields an action changed, before → after, plus the free-text
 * note behind it (a delete reason, a venue's decline reason…). */
export function AuditLogChanges({ log, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const blank = t('clubAdmin.monitoring.emptyValue');

  return (
    <YStack gap={6} testID={testID}>
      <Text fontSize={12.5} fontWeight="700" color="$color">
        {t('clubAdmin.monitoring.changesCount', { vars: { total: log.changes.length } })}
      </Text>
      {log.changes.length === 0 ? (
        <Text testID={`${testID}-none`} fontSize={12} color="$muted">
          {t('clubAdmin.monitoring.noChanges')}
        </Text>
      ) : null}
      {log.changes.map((change) => (
        <YStack key={change.field} gap={1}>
          <Text fontSize={12} fontWeight="600" color="$color">
            {change.field}
          </Text>
          <Text fontSize={12} color="$muted">
            {[change.from || blank, change.to || blank].join(' → ')}
          </Text>
        </YStack>
      ))}
      {log.note ? (
        <Text testID={`${testID}-note`} fontSize={12} color="$muted">
          <Text fontWeight="700" color="$color">
            {t('clubAdmin.monitoring.note')}
          </Text>{' '}
          {log.note}
        </Text>
      ) : null}
    </YStack>
  );
}
