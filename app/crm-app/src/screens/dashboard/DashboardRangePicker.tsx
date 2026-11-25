import { ScrollView } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { CRM_DASHBOARD_RANGES, type CrmDashboardRange, type CrmDateWindow } from '@duncit/utils';

import { DateField } from '@/components/DateField';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

/** The app's words for each range (literal keys, so the localization gate sees them). */
const RANGE_KEY: Record<CrmDashboardRange, string> = {
  today: 'crmApp.dashboard.range.today',
  week: 'crmApp.dashboard.range.week',
  month: 'crmApp.dashboard.range.month',
  year: 'crmApp.dashboard.range.year',
  all: 'crmApp.dashboard.range.all',
  custom: 'crmApp.dashboard.range.custom',
};

interface Props {
  range: CrmDashboardRange;
  onRange: (range: CrmDashboardRange) => void;
  custom: CrmDateWindow;
  onCustom: (window: CrmDateWindow) => void;
}

/**
 * The portal's range filter: the preset ranges and Custom in one row that
 * scrolls sideways, and for Custom the From and To days (To never before From).
 */
export function DashboardRangePicker({ range, onRange, custom, onCustom }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap="$2" role="radiogroup" aria-label={t('crm.dashboard.dashboardTimeRange')}>
          {CRM_DASHBOARD_RANGES.map((r) => (
            <DuncitButton
              key={r}
              label={t(RANGE_KEY[r])}
              onPress={() => onRange(r)}
              size="sm"
              variant={range === r ? 'solid' : 'outline'}
              testID={`dashboard-range-${r}`}
            />
          ))}
        </XStack>
      </ScrollView>
      {range === 'custom' ? (
        <XStack gap="$3">
          <YStack flex={1}>
            <DateField
              label={t('crm.dashboard.from')}
              value={custom.from ?? null}
              onChange={(from) => onCustom({ ...custom, from: from ?? undefined })}
              maximumDate={custom.to}
              placeholder={t('crmApp.dashboard.pickDate')}
              testID="dashboard-from"
            />
          </YStack>
          <YStack flex={1}>
            <DateField
              label={t('crm.dashboard.to')}
              value={custom.to ?? null}
              onChange={(to) => onCustom({ ...custom, to: to ?? undefined })}
              minimumDate={custom.from}
              placeholder={t('crmApp.dashboard.pickDate')}
              testID="dashboard-to"
            />
          </YStack>
        </XStack>
      ) : null}
    </YStack>
  );
}
