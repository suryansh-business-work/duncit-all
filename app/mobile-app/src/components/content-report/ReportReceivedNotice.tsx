import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The report's reference, as its acknowledgement email carries it. */
  reportNo: string;
}

/**
 * What the report sheet shows once a report has landed.
 *
 * Said inside the sheet rather than as a toast: the app has no toast, and the
 * sheet opens over a story or post viewer that is itself a modal, so anything
 * raised at the app root would sit behind both. mWeb twin: the success notify
 * in ReportContentDialog (rule 27).
 */
export function ReportReceivedNotice({ reportNo }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  return (
    <YStack testID="report-content-received" role="alert" alignItems="center" gap={10} paddingVertical={12}>
      <MaterialIcons name="check-circle-outline" size={40} color={primary} />
      <Text fontSize={16} fontWeight="700" color="$color" textAlign="center">
        {t('contentReport.submittedTitle')}
      </Text>
      <Text fontSize={14} color="$muted" textAlign="center">
        {reportNo
          ? t('contentReport.submittedRef', { vars: { ref: reportNo } })
          : t('contentReport.submitted')}
      </Text>
    </YStack>
  );
}
