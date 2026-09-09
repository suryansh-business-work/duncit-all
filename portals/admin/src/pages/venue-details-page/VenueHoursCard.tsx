import { Stack } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { ChipList, InfoRow } from '@duncit/ui';
import { formatDate } from '@duncit/app-settings';
import { weekdayLabels } from '@duncit/slots';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import { weeklyOffNames } from './venue-values';
import type { VenueSettings } from './queries';

/** When the venue is open — hours, the days it is closed, the dates it is
 * closed, and whether slots keep publishing themselves. */
export default function VenueHoursCard({ settings }: Readonly<{ settings: VenueSettings }>) {
  const { t } = useTranslation();
  const hours = settings.operating_hours;
  const auto = settings.auto_extend;
  const offNames = weeklyOffNames(settings.weekly_off_days ?? [], weekdayLabels(t).full);
  const holidays = (settings.holidays ?? []).map((h) => formatDate(h));

  let autoExtendValue = t('admin.venueDetails.autoExtendOff');
  if (auto?.enabled && auto.until) {
    autoExtendValue = t('admin.venueDetails.autoExtendUntil', {
      vars: { days: auto.horizon_days, until: formatDate(auto.until) },
    });
  } else if (auto?.enabled) {
    autoExtendValue = t('admin.venueDetails.autoExtendOn', { vars: { days: auto.horizon_days } });
  }

  return (
    <SectionCard icon={<ScheduleIcon color="primary" />} title={t('admin.venueDetails.operatingHours')}>
      <Stack spacing={1.5}>
        <InfoRow
          label={t('admin.venueDetails.operatingHours')}
          value={t('admin.venueDetails.hoursRange', {
            vars: { open: hours?.open ?? '', close: hours?.close ?? '' },
          })}
        />
        <InfoRow
          label={t('admin.venueDetails.weeklyOff')}
          value={<ChipList items={offNames} empty={t('admin.venueDetails.noWeeklyOff')} />}
        />
        <InfoRow
          label={t('admin.venueDetails.holidays')}
          value={<ChipList items={holidays} empty={t('admin.venueDetails.noHolidays')} />}
        />
        <InfoRow label={t('admin.venueDetails.autoExtend')} value={autoExtendValue} />
      </Stack>
    </SectionCard>
  );
}
