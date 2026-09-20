import { Alert, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import SyncProblemIcon from '@mui/icons-material/SyncProblem';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsStagingCompare } from '@duncit/gql-types';

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
} as const;

interface Props {
  compare: DnsStagingCompare;
}

/**
 * The counts the page is opened for: how many records each stack holds across
 * the paired types, and how far apart they are.
 *
 * The two totals sit side by side deliberately — "do the counts match" is the
 * question, and two numbers answer it faster than any of the breakdowns do.
 */
export default function StagingSummary({ compare }: Readonly<Props>) {
  const { t } = useTranslation();
  const countsMatch = compare.production_count === compare.staging_count;
  const problems = compare.missing_staging + compare.missing_production + compare.differs;

  return (
    <>
      {compare.in_sync ? (
        <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} data-testid="dns-staging-banner">
          {t('tech.dnsStaging.bannerInSync', { vars: { types: compare.paired_types.join(', ') } })}
        </Alert>
      ) : (
        <Alert severity="warning" icon={<SyncProblemIcon fontSize="inherit" />} data-testid="dns-staging-banner">
          {t('tech.dnsStaging.bannerOutOfSync', { count: problems, vars: { count: String(problems) } })}
        </Alert>
      )}
      <Box sx={GRID}>
        <StatCard
          label={t('tech.dnsStaging.productionRecords')}
          value={String(compare.production_count)}
          hint={t('tech.dnsStaging.acrossTypes', { vars: { types: compare.paired_types.join(', ') } })}
          testId="dns-staging-production-count"
        />
        <StatCard
          label={t('tech.dnsStaging.stagingRecords')}
          value={String(compare.staging_count)}
          valueColor={countsMatch ? 'success.main' : 'error.main'}
          hint={countsMatch ? t('tech.dnsStaging.countsMatch') : t('tech.dnsStaging.countsDiffer')}
          hintColor={countsMatch ? 'success.main' : 'error.main'}
          icon={countsMatch ? <CheckCircleIcon fontSize="small" /> : <ErrorOutlinedIcon fontSize="small" />}
          testId="dns-staging-staging-count"
        />
        <StatCard
          label={t('tech.dnsStaging.matchedHosts')}
          value={String(compare.matched)}
          hint={t('tech.dnsStaging.matchedHint')}
          testId="dns-staging-matched"
        />
        <StatCard
          label={t('tech.dnsStaging.missingOnStaging')}
          value={String(compare.missing_staging)}
          valueColor={compare.missing_staging > 0 ? 'error.main' : undefined}
          hint={t('tech.dnsStaging.missingOnStagingHint')}
          testId="dns-staging-missing"
        />
        <StatCard
          label={t('tech.dnsStaging.differingHosts')}
          value={String(compare.differs + compare.missing_production)}
          valueColor={compare.differs + compare.missing_production > 0 ? 'warning.main' : undefined}
          hint={t('tech.dnsStaging.differingHint')}
          testId="dns-staging-differing"
        />
      </Box>
    </>
  );
}
