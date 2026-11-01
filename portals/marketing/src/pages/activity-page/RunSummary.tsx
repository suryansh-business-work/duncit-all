import { Alert, AlertTitle, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { TRIGGER_LABEL, WORKFLOW_LABEL, isOpenRun } from './copy';
import type { MarketingRunDetail } from './queries';
import { actorLabel, durationMs, formatDuration } from './runFormat';

const LABEL_WIDTH = 110;

/** The AI spend line, or null when the run cost nothing. */
function CostLine({ run }: Readonly<{ run: MarketingRunDetail }>) {
  const { t, locale } = useTranslation();
  const { tokens_in, tokens_out, amount, currency } = run.cost;
  if (tokens_in + tokens_out <= 0 && amount <= 0) return null;
  return (
    <InfoRow
      variant="inline"
      labelWidth={LABEL_WIDTH}
      label={t('marketing.runs.cost')}
      testId="marketing-run-cost"
      value={
        <>
          {t('marketing.runs.costTokens', {
            vars: { tokensIn: tokens_in.toLocaleString(locale), tokensOut: tokens_out.toLocaleString(locale) },
          })}
          {amount > 0 && (
            <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
              {t('marketing.runs.costAmount', {
                vars: { amount: amount.toLocaleString(locale, { maximumFractionDigits: 4 }), currency },
              })}
            </Typography>
          )}
        </>
      }
    />
  );
}

/** What the run was, who ran it, when, and — when it went wrong — what happened. */
export default function RunSummary({ run }: Readonly<{ run: MarketingRunDetail }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const took = durationMs(run.started_at, run.finished_at);

  return (
    <Stack spacing={1.5} data-testid="marketing-run-summary">
      {run.error && (
        <Alert severity="error">
          <AlertTitle>{t('marketing.runs.error')}</AlertTitle>
          {run.error}
        </Alert>
      )}
      {run.cancel_requested && isOpenRun(run.status) && <Alert severity="info">{t('marketing.runs.cancelRequested')}</Alert>}
      <Stack spacing={0.75}>
        <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.runs.workflow')} value={t(WORKFLOW_LABEL[run.workflow])} />
        <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.runs.trigger')} value={t(TRIGGER_LABEL[run.trigger])} />
        <InfoRow
          variant="inline"
          labelWidth={LABEL_WIDTH}
          label={t('marketing.runs.actor')}
          value={
            <>
              {actorLabel(run.actor, t)}
              {run.actor.email && (
                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                  {run.actor.email}
                </Typography>
              )}
            </>
          }
        />
        <InfoRow
          variant="inline"
          labelWidth={LABEL_WIDTH}
          label={t('marketing.runs.started')}
          value={run.started_at ? formatDateTime(run.started_at) : t('marketing.runs.notStarted')}
        />
        <InfoRow
          variant="inline"
          labelWidth={LABEL_WIDTH}
          label={t('marketing.runs.finished')}
          value={run.finished_at ? formatDateTime(run.finished_at) : EM_DASH}
        />
        <InfoRow
          variant="inline"
          labelWidth={LABEL_WIDTH}
          label={t('marketing.runs.duration')}
          value={took === null ? EM_DASH : formatDuration(took, t)}
        />
        {run.retries > 0 && (
          <InfoRow variant="inline" labelWidth={LABEL_WIDTH} label={t('marketing.runs.retries')} value={run.retries} />
        )}
        {run.parent_run_id && (
          <InfoRow
            variant="inline"
            labelWidth={LABEL_WIDTH}
            label={t('marketing.runs.parentRun')}
            value={run.parent_run_id}
            valueSx={{ fontFamily: 'monospace' }}
          />
        )}
        <CostLine run={run} />
      </Stack>
    </Stack>
  );
}
