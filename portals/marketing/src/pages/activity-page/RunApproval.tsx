import { Paper, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow, StatusChip } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { DECISION_COLORS, DECISION_LABEL } from './copy';
import type { MarketingRunApproval } from './queries';

const LABEL_WIDTH = 110;

/** Who was asked, what they said and why — only for a run that needed asking. */
export default function RunApproval({ approval }: Readonly<{ approval: MarketingRunApproval }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  if (!approval.required) return null;

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }} data-testid="marketing-run-approval">
      <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
        {t('marketing.runs.approvalTitle')}
      </Typography>
      <Stack spacing={0.75}>
        {approval.requested_at && (
          <InfoRow
            variant="inline"
            labelWidth={LABEL_WIDTH}
            label={t('marketing.runs.approvalRequested')}
            value={formatDateTime(approval.requested_at)}
          />
        )}
        <InfoRow
          variant="inline"
          labelWidth={LABEL_WIDTH}
          label={t('marketing.runs.approvalDecision')}
          value={
            approval.decision ? (
              <StatusChip
                status={approval.decision}
                colorMap={DECISION_COLORS}
                label={t(DECISION_LABEL[approval.decision])}
              />
            ) : (
              t('marketing.runs.approvalPending')
            )
          }
        />
        {approval.decision && (
          <InfoRow
            variant="inline"
            labelWidth={LABEL_WIDTH}
            label={t('marketing.runs.approvalDecidedBy')}
            value={approval.decided_by_name || approval.decided_by || EM_DASH}
          />
        )}
        {approval.decided_at && (
          <InfoRow
            variant="inline"
            labelWidth={LABEL_WIDTH}
            label={t('marketing.runs.approvalDecidedAt')}
            value={formatDateTime(approval.decided_at)}
          />
        )}
        {approval.note && (
          <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.runs.approvalNote')} value={approval.note} />
        )}
      </Stack>
    </Paper>
  );
}
