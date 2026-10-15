import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { reportPendingCopyKey } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The earlier report's reference; blank when the server had none. */
  reportNo: string;
}

/**
 * What the report sheet shows instead of the form while the viewer's earlier
 * report on the same thing is still with Legal. mWeb twin: ReportPendingNotice
 * (rule 27).
 */
export function ReportPendingNotice({ reportNo }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  return (
    <YStack
      testID="report-content-pending"
      role="status"
      alignItems="center"
      gap={10}
      paddingVertical={12}
    >
      <MaterialIcons name="hourglass-empty" size={40} color={primary} />
      <Text fontSize={16} fontWeight="700" color="$color" textAlign="center">
        {t('contentReport.alreadyPendingTitle')}
      </Text>
      <Text fontSize={14} color="$muted" textAlign="center">
        {t(reportPendingCopyKey(reportNo), { vars: { ref: reportNo } })}
      </Text>
    </YStack>
  );
}
