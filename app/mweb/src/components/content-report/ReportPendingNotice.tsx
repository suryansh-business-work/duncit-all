import { Stack, Typography } from '@mui/material';
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import { reportPendingCopyKey } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The earlier report's reference; blank when the server had none. */
  reportNo: string;
}

/**
 * What the report dialog shows instead of the form while the viewer's earlier
 * report on the same thing is still with Legal. Native twin:
 * ReportPendingNotice (rule 27).
 */
export default function ReportPendingNotice({ reportNo }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      data-testid="report-content-pending"
      role="status"
      spacing={1}
      sx={{ alignItems: 'center', textAlign: 'center', py: 1.5 }}
    >
      <HourglassTopOutlinedIcon color="primary" sx={{ fontSize: 40 }} aria-hidden />
      <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
        {t('contentReport.alreadyPendingTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t(reportPendingCopyKey(reportNo), { vars: { ref: reportNo } })}
      </Typography>
    </Stack>
  );
}
