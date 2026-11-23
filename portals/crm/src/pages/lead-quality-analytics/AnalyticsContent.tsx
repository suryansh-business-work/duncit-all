import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LeadQualityAnalytics } from '../../api/leadQuality.gql';
import { AnalyticsSection } from './AnalyticsSection';
import AnalyticsTable from './AnalyticsTable';
import QualityCharts, { TWO_COLUMNS } from './QualityCharts';
import { OriginComparison, ResearchQueueSummary } from './ResearchSummary';
import TypeOverview, { StatGrid } from './TypeOverview';
import { cityColumns, conversionColumns, missingColumns, topLeadColumns } from './analyticsColumns';
import type { CityRow, ConversionRow, MissingRow, TopLead } from './analyticsData';

const topId = (row: TopLead) => `${row.entity_type}:${row.id}`;
const searchTop = (row: TopLead) => `${row.name} ${row.city} ${row.classification_label}`;
const cityId = (row: CityRow) => row.city;
const searchCity = (row: CityRow) => row.city;
const conversionId = (row: ConversionRow) => row.classification;
const searchConversion = (row: ConversionRow) => row.label;
const missingId = (row: MissingRow) => `${row.entity_type}:${row.criterion}`;
const searchMissing = (row: MissingRow) => row.criterion;
const HIGHEST_FIRST = { field: 'score', dir: 'desc' } as const;

/** Every analytics section, worked out by the server from the stored scores of the chosen lead types. */
export default function AnalyticsContent({ data }: Readonly<{ data: LeadQualityAnalytics }>) {
  const { t } = useTranslation();
  const columns = useMemo(
    () => ({ top: topLeadColumns(t), cities: cityColumns(t), conversion: conversionColumns(t), missing: missingColumns(t) }),
    [t]
  );

  return (
    <Stack spacing={2}>
      <TypeOverview stats={data.by_type} />
      <QualityCharts data={data} />
      <AnalyticsSection title={t('crm.leadQualityAnalytics.topLeadsTitle')} subtitle={t('crm.leadQualityAnalytics.topLeadsHint')} testId="top-leads">
        <AnalyticsTable
          tableId="crm-lead-quality-top-leads"
          ariaLabel={t('crm.leadQualityAnalytics.topLeadsTitle')}
          rows={data.top_leads}
          columns={columns.top}
          getRowId={topId}
          searchOf={searchTop}
          emptyText={t('crm.leadQualityAnalytics.noScores')}
          defaultSort={HIGHEST_FIRST}
        />
      </AnalyticsSection>
      <Box sx={TWO_COLUMNS}>
        <AnalyticsSection title={t('crm.leadQualityAnalytics.citiesTitle')} subtitle={t('crm.leadQualityAnalytics.citiesHint')} testId="cities">
          <AnalyticsTable
            tableId="crm-lead-quality-cities"
            ariaLabel={t('crm.leadQualityAnalytics.citiesTitle')}
            rows={data.cities}
            columns={columns.cities}
            getRowId={cityId}
            searchOf={searchCity}
            emptyText={t('crm.leadQualityAnalytics.noCities')}
          />
        </AnalyticsSection>
        <AnalyticsSection title={t('crm.leadQualityAnalytics.conversionTitle')} subtitle={t('crm.leadQualityAnalytics.conversionHint')} testId="conversion">
          <AnalyticsTable
            tableId="crm-lead-quality-conversion"
            ariaLabel={t('crm.leadQualityAnalytics.conversionTitle')}
            rows={data.conversion}
            columns={columns.conversion}
            getRowId={conversionId}
            searchOf={searchConversion}
            emptyText={t('crm.leadQualityAnalytics.noScores')}
          />
        </AnalyticsSection>
      </Box>
      <Box sx={TWO_COLUMNS}>
        <OriginComparison origins={data.origins} />
        <ResearchQueueSummary queue={data.research_queue} />
      </Box>
      <AnalyticsSection title={t('crm.leadQualityAnalytics.gapsTitle')} subtitle={t('crm.leadQualityAnalytics.gapsHint')} testId="evidence-gaps">
        <Stack spacing={2}>
          <StatGrid items={[{ key: 'duplicate-leads', label: t('crm.leadQualityAnalytics.duplicateLeads'), value: data.duplicate_leads }]} />
          <AnalyticsTable
            tableId="crm-lead-quality-missing-evidence"
            ariaLabel={t('crm.leadQualityAnalytics.missingTitle')}
            rows={data.missing_evidence}
            columns={columns.missing}
            getRowId={missingId}
            searchOf={searchMissing}
            emptyText={t('crm.leadQualityAnalytics.noMissing')}
          />
        </Stack>
      </AnalyticsSection>
    </Stack>
  );
}
