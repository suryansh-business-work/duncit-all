import { Alert, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import StudioPodRow from './StudioPodRow';
import StudioPodsFigures from './StudioPodsFigures';
import type { StudioPod, StudioPodSummary } from './types';

interface BodyProps {
  loading: boolean;
  failed: boolean;
  pods: readonly StudioPod[];
  emptyText: string;
  currencySymbol: string;
  onRetry: () => void;
}

/** Loading / error / empty / list — hoisted so it is not redefined per render. */
function StudioPodsBody({
  loading,
  failed,
  pods,
  emptyText,
  currencySymbol,
  onRetry,
}: Readonly<BodyProps>) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 3 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }
  if (failed) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            {t('mweb.studioPods.retry')}
          </Button>
        }
      >
        {t('mweb.studioPods.error')}
      </Alert>
    );
  }
  if (pods.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {pods.map((pod) => (
        <StudioPodRow key={pod.id} pod={pod} currencySymbol={currencySymbol} />
      ))}
    </Stack>
  );
}

interface Props {
  title: string;
  subtitle: string;
  /** Already-translated word for what the figures cover — Venues or Clubs. */
  scopeLabel: string;
  emptyText: string;
  pods: readonly StudioPod[];
  summary: StudioPodSummary;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}

/**
 * The pods section BOTH partner studios render (rule 34/40): the figures strip
 * and the row list over one shared pod shape. Venue Studio and Club Studio pass
 * different copy — never a different layout, and never different arithmetic.
 */
export default function StudioPodsSection({
  title,
  subtitle,
  scopeLabel,
  emptyText,
  pods,
  summary,
  loading,
  failed,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // The summary counts every pod in scope while the list is capped, so this is
  // exact — the old `pods.length >= CAP` also fired on a scope of exactly 500
  // where nothing was truncated. Native uses the same test.
  const capped = summary.total > pods.length;

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {subtitle}
            </Typography>
          </Stack>

          {/* Hidden while the first load runs: a strip reading "Total 0 /
              None scheduled" under a spinner states something false. Native
              already withheld it. */}
          {!loading && <StudioPodsFigures summary={summary} scopeLabel={scopeLabel} />}

          {capped && (
            <Typography variant="caption" color="text.secondary">
              {t('mweb.studioPods.showingLatest', { vars: { pods: pods.length } })}
            </Typography>
          )}

          <StudioPodsBody
            loading={loading}
            failed={failed}
            pods={pods}
            emptyText={emptyText}
            currencySymbol={summary.currency_symbol}
            onRetry={onRetry}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
