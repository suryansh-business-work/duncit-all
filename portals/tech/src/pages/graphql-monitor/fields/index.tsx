import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import MetricTiles from '../../stress-testing/components/MetricTiles';
import MonitorHeader from '../components/MonitorHeader';
import FieldsTable from './FieldsTable';
import { MONITOR_POLL_MS, useMonitorRange } from '../hooks';
import { GRAPHQL_MONITOR_FIELDS, type FieldUsage } from '../queries';

type FieldScope = 'QUERY' | 'MUTATION' | 'TYPE' | 'ALL';

const EMPTY: FieldUsage[] = [];

/**
 * Tech > GraphQL Monitor > Fields — the whole schema, one row per field, with
 * how many operations selected it in the range and how long its resolver takes.
 * Queries open first: "every query we have, and which are actually called" is
 * the question this page is opened with. A field at zero is a candidate to
 * retire.
 */
export default function GraphqlFieldsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useMonitorRange();
  const { data, loading, error } = useQuery<{ graphqlMonitorFields: FieldUsage[] }>(GRAPHQL_MONITOR_FIELDS, {
    variables: { range },
    fetchPolicy: 'cache-and-network',
    pollInterval: MONITOR_POLL_MS,
  });
  const fields = data?.graphqlMonitorFields ?? EMPTY;

  const counts = useMemo(() => {
    const of = (kind: FieldUsage['kind']) => fields.filter((field) => field.kind === kind).length;
    return {
      queries: of('QUERY'),
      mutations: of('MUTATION'),
      types: of('TYPE'),
      unusedRoot: fields.filter((field) => field.kind !== 'TYPE' && field.referenced === 0).length,
      deprecated: fields.filter((field) => field.deprecation_reason !== null).length,
    };
  }, [fields]);

  const items = useMemo<DuncitTabItem<FieldScope>[]>(
    () => [
      { value: 'QUERY', label: t('tech.graphqlMonitor.scopeQueries', { vars: { total: counts.queries } }) },
      { value: 'MUTATION', label: t('tech.graphqlMonitor.scopeMutations', { vars: { total: counts.mutations } }) },
      { value: 'TYPE', label: t('tech.graphqlMonitor.scopeTypes', { vars: { total: counts.types } }) },
      { value: 'ALL', label: t('tech.graphqlMonitor.scopeAll', { vars: { total: fields.length } }) },
    ],
    [counts, fields.length, t]
  );
  const tabs = useTabParam<FieldScope>({ items, fallback: 'QUERY' });
  const visible = useMemo(
    () => (tabs.value === 'ALL' ? fields : fields.filter((field) => field.kind === tabs.value)),
    [fields, tabs.value]
  );

  return (
    <Stack spacing={2.5} data-testid="graphql-monitor-fields-page">
      <MonitorHeader
        title={t('tech.graphqlMonitor.fieldsTitle')}
        subtitle={t('tech.graphqlMonitor.fieldsSubtitle')}
        range={range}
        onRangeChange={setRange}
        testId="graphql-monitor-fields"
      />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        <Stack spacing={2}>
          <MetricTiles
            tiles={[
              { id: 'queries', label: t('tech.graphqlMonitor.kpiQueries'), value: String(counts.queries) },
              { id: 'mutations', label: t('tech.graphqlMonitor.kpiMutations'), value: String(counts.mutations) },
              {
                id: 'unused',
                label: t('tech.graphqlMonitor.kpiUnusedRoot'),
                value: String(counts.unusedRoot),
                hint: t('tech.graphqlMonitor.kpiUnusedRootHint'),
              },
              { id: 'deprecated', label: t('tech.graphqlMonitor.kpiDeprecated'), value: String(counts.deprecated) },
            ]}
          />
          <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile data-testid="graphql-monitor-fields-tabs" />
          <FieldsTable key={tabs.value} fields={visible} />
        </Stack>
      </QueryGuard>
    </Stack>
  );
}
