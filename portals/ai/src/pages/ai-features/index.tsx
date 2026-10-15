import { useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import FeaturesTable from './FeaturesTable';
import RangeSelect, { useRangeParam } from './RangeSelect';
import { useFeatureToggle } from './useFeatureToggle';
import { AI_FEATURES, type AiFeature } from './queries';

/**
 * AI Features — every place the product calls an AI model, with an On/Off
 * switch and what each one used and cost over the range.
 *
 * The list is the server's task catalogue: every OpenAI call is attributed to
 * one of its keys, so a feature cannot spend without appearing here. A row
 * opens that feature's own call log.
 */
export default function AiFeaturesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rangeDays, setRangeDays] = useRangeParam();
  const { data, loading, error, refetch } = useQuery<{ aiFeatures: AiFeature[] }>(AI_FEATURES, {
    variables: { range_days: rangeDays },
    fetchPolicy: 'cache-and-network',
  });

  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const { toggle, pendingKey } = useFeatureToggle(reload);
  const open = useCallback(
    (feature: AiFeature) =>
      navigate(`/ai-features/${encodeURIComponent(feature.key)}?days=${rangeDays}`),
    [navigate, rangeDays]
  );

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {t('ai.features.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ai.features.subtitle')}
          </Typography>
        </Box>
        <RangeSelect value={rangeDays} onChange={setRangeDays} />
      </Stack>
      <QueryGuard
        loading={loading && !data}
        error={data ? undefined : error}
        errorText={t('ai.features.loadFailed')}
        spinnerSx={{ py: 6 }}
      >
        {() => (
          <FeaturesTable
            rows={data?.aiFeatures ?? []}
            pendingKey={pendingKey}
            onToggle={toggle}
            onOpen={open}
          />
        )}
      </QueryGuard>
    </Stack>
  );
}
