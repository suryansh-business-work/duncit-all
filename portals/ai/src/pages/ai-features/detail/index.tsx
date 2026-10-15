import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useApolloTableFetch } from '@duncit/table';
import OpenAiLogsTable from '../../openai-logs/OpenAiLogsTable';
import OpenAiLogDrawer from '../../openai-logs/OpenAiLogDrawer';
import { OPENAI_LOGS_TABLE, type OpenAiLogRow } from '../../openai-logs/queries';
import RangeSelect, { useRangeParam } from '../RangeSelect';
import { useFeatureToggle } from '../useFeatureToggle';
import { AI_FEATURE_ONE, type AiFeature } from '../queries';
import FeatureSummary from './FeatureSummary';

/** The task/area columns are pinned on this page, so they offer no filter options. */
const NO_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [];

/**
 * One AI feature — its switch, its usage over the range, and every call it
 * made, paged by the server. The table and drawer are the OpenAI Logs ones,
 * with the query pinned to this feature's task key.
 */
export default function AiFeatureDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { key = '' } = useParams<{ key: string }>();
  const [rangeDays, setRangeDays] = useRangeParam();
  const refetchRef = useRef<(() => void) | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<{ aiFeature: AiFeature }>(AI_FEATURE_ONE, {
    variables: { key, range_days: rangeDays },
    fetchPolicy: 'cache-and-network',
    skip: !key,
  });
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
    refetchRef.current?.();
  }, [refetch]);
  const { toggle, pendingKey } = useFeatureToggle(reload);

  const fetchRows = useApolloTableFetch<OpenAiLogRow>(
    client,
    OPENAI_LOGS_TABLE,
    'openAiUsageLogsTable',
    { extraVariables: { task: key } },
    [key]
  );
  const openRow = useCallback((row: OpenAiLogRow) => setOpenId(row.id), []);
  const closeRow = useCallback(() => setOpenId(null), []);
  const back = useCallback(() => navigate(`/ai-features?days=${rangeDays}`), [navigate, rangeDays]);

  const feature = data?.aiFeature;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Tooltip title={t('ai.features.back')}>
          <span>
            <DuncitIconButton aria-label={t('ai.features.back')} onClick={back}>
              <ArrowBackIcon />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <RangeSelect value={rangeDays} onChange={setRangeDays} />
      </Stack>
      <QueryGuard
        loading={loading && !feature}
        error={feature ? undefined : error}
        errorText={t('ai.features.loadFailed')}
        spinnerSx={{ py: 6 }}
      >
        {() =>
          feature ? (
            <FeatureSummary feature={feature} busy={pendingKey === feature.key} onToggle={toggle} />
          ) : null
        }
      </QueryGuard>
      <Typography variant="h6" component="h2">
        {t('ai.features.logsTitle')}
      </Typography>
      <OpenAiLogsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onRowClick={openRow}
        taskOptions={NO_OPTIONS}
        moduleOptions={NO_OPTIONS}
      />
      <OpenAiLogDrawer logId={openId} onClose={closeRow} />
    </Stack>
  );
}
