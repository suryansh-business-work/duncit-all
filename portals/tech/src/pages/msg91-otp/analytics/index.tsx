import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import Msg91PageFrame from '../Msg91PageFrame';
import { ANALYTICS_MAX_DAYS, MSG91_WIDGET_ANALYTICS } from '../queries';
import { useMsg91Report } from '../useMsg91Report';
import AnalyticsTiles from './AnalyticsTiles';
import DailyChart from './DailyChart';
import DaysTable from './DaysTable';

/**
 * Tech → MSG91 OTP Logs → Analytics: the widget's daily traffic from MSG91 —
 * how many codes were asked for, how many were verified, and on which channel
 * — for a window of up to 31 days.
 */
export default function Msg91AnalyticsPage() {
  const { t } = useTranslation();
  const report = useMsg91Report(MSG91_WIDGET_ANALYTICS, ANALYTICS_MAX_DAYS);
  const analytics = report.data?.msg91WidgetAnalytics;
  const days = analytics?.days ?? [];

  let body = null;
  if (analytics?.total && days.length > 0) {
    body = (
      <>
        <AnalyticsTiles total={analytics.total} />
        <DailyChart days={days} />
        <DaysTable days={days} />
      </>
    );
  } else if (analytics) {
    body = (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.msg91.noTraffic')}
      </Typography>
    );
  }

  return (
    <Msg91PageFrame
      title={t('tech.msg91.analyticsTitle')}
      subtitle={t('tech.msg91.analyticsSubtitle')}
      range={report.range}
      maxDays={ANALYTICS_MAX_DAYS}
      loading={report.loading}
      error={report.error}
      onRange={report.onRange}
    >
      {body}
    </Msg91PageFrame>
  );
}
