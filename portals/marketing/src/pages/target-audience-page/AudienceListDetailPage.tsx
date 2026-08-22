import { useMemo } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Chip, Stack, Typography } from '@mui/material';
import { useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { BackHeader, QueryGuard } from '@duncit/ui';
import AudienceTable from './AudienceTable';
import { AUDIENCE_LIST, AUDIENCE_TABLE } from './queries';
import type { AudienceListRow, AudienceRow } from './helpers';
import { useTranslation } from '@duncit/app-settings';

/** The stored criteria, back in the shape the table sends to the server. */
const toFilters = (list?: AudienceListRow | null): TableFilterValue[] =>
  (list?.filters ?? []).map((f) => ({
    field: f.field,
    op: f.op as TableFilterValue['op'],
    value: f.value ?? undefined,
    values: f.values,
  }));

const criterionLabel = (f: AudienceListRow['filters'][number]) => {
  const detail = f.values.length > 0 ? f.values.join(', ') : f.value;
  return detail ? `${f.field}: ${detail}` : f.field;
};

/** Who is in a saved list right now — the criteria re-run, not a snapshot. */
export default function AudienceListDetailPage() {
  const { t } = useTranslation();
  const { listId = '' } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();

  const { data, loading, error } = useQuery<{ audienceList: AudienceListRow | null }>(AUDIENCE_LIST, {
    variables: { id: listId },
    fetchPolicy: 'cache-and-network',
    skip: !listId,
  });
  const list = data?.audienceList;

  const fetchRows = useApolloTableFetch<AudienceRow>(client, AUDIENCE_TABLE, 'audienceTable');
  const columnDeps = useMemo(() => ({ formatDate: formatDateTime }), [formatDateTime]);
  const externalFilters = useMemo(() => toFilters(list), [list]);

  return (
    <QueryGuard
      loading={loading && !data}
      error={error}
      errorText={error?.message}
      notFound={!list}
      notFoundText="That audience list no longer exists."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => (
        <Stack spacing={2}>
          <BackHeader
            onBack={() => navigate('/audience')}
            backAriaLabel="Back to audience lists"
            eyebrow={`Owned by ${list!.owner}`}
            title={list!.name}
          />

          {list!.description && (
            <Typography variant="body2" color="text.secondary">
              {list!.description}
            </Typography>
          )}

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip
              size="small"
              color="primary"
              label={`${list!.member_count.toLocaleString()} people right now`}
            />
            {list!.filters.length === 0 && <Chip size="small" variant="outlined" label={t('marketing.targetAudience.noFiltersEveryone')} />}
            {list!.filters.map((f) => (
              <Chip key={`${f.field}-${f.op}`} size="small" variant="outlined" label={criterionLabel(f)} />
            ))}
          </Stack>

          <AudienceTable
            fetchRows={fetchRows}
            columnDeps={columnDeps}
            externalFilters={externalFilters}
          />
        </Stack>
      )}
    </QueryGuard>
  );
}
