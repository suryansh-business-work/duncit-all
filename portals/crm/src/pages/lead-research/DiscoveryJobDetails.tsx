import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '@duncit/shell';
import type { LeadDiscoveryJob } from '../../api/leadResearch.gql';
import { SOURCE_KIND_KEY, labelOf } from '../../lib/leadResearchLabels';

interface Props {
  job: LeadDiscoveryJob;
}

/** Qualifying new leads found of the number asked for. */
export function JobProgress({ job }: Readonly<Props>) {
  const { t } = useTranslation();
  const value = job.total > 0 ? Math.min(100, (job.succeeded / job.total) * 100) : 0;
  const text = t('crm.leadResearch.jobProgress', { vars: { found: job.succeeded, total: job.total } });
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2">{text}</Typography>
      <LinearProgress variant="determinate" value={value} aria-label={t('crm.leadResearch.progressLabel')} aria-valuetext={text} />
    </Stack>
  );
}

/** Every count the discovery keeps, each with its name. */
export function JobStats({ job }: Readonly<Props>) {
  const { t } = useTranslation();
  const { stats } = job;
  const items = [
    { key: 'found', label: t('crm.leadResearch.statFound'), value: stats.found },
    { key: 'saved', label: t('crm.leadResearch.statSaved'), value: stats.saved },
    { key: 'qualifying', label: t('crm.leadResearch.statQualifying'), value: stats.qualifying },
    { key: 'duplicates', label: t('crm.leadResearch.statDuplicates'), value: stats.duplicates },
    { key: 'already_queued', label: t('crm.leadResearch.statAlreadyQueued'), value: stats.already_queued },
    { key: 'refused', label: t('crm.leadResearch.statRefused'), value: stats.refused },
    { key: 'searches', label: t('crm.leadResearch.statSearches'), value: t('crm.leadResearch.searchesRun', { vars: { run: job.searches_run, total: job.queries.length } }) },
  ];
  return (
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
      {items.map((item) => (
        <Box key={item.key}>
          <Typography component="dt" variant="caption" sx={{ color: 'text.secondary' }}>
            {item.label}
          </Typography>
          <Typography component="dd" variant="subtitle2" sx={{ m: 0, fontWeight: 700 }}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** What was asked for: where, what kind, which sources and the score to reach. */
export function JobRequest({ job }: Readonly<Props>) {
  const { t } = useTranslation();
  const where = [job.locality, job.city].filter(Boolean).join(', ');
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
      {where ? <Chip size="small" variant="outlined" label={where} /> : null}
      {job.category ? <Chip size="small" variant="outlined" label={job.category} /> : null}
      {job.keywords ? <Chip size="small" variant="outlined" label={t('crm.leadResearch.keywordsValue', { vars: { keywords: job.keywords } })} /> : null}
      {job.min_score == null ? null : <Chip size="small" variant="outlined" label={t('crm.leadResearch.minScoreValue', { vars: { score: job.min_score } })} />}
      {job.sources.map((source) => (
        <Chip key={source} size="small" variant="outlined" label={labelOf(t, SOURCE_KIND_KEY, source)} />
      ))}
    </Stack>
  );
}

/** The searches the plan made, behind a disclosure so a long plan does not bury the card. */
export function PlannedSearches({ job }: Readonly<Props>) {
  const { t } = useTranslation();
  if (job.queries.length === 0) return null;
  return (
    <Accordion disableGutters variant="outlined" sx={{ '&::before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2">{t('crm.leadResearch.plannedSearches', { count: job.queries.length })}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
          {job.queries.map((query) => (
            <Typography key={query} component="li" variant="body2">
              {query}
            </Typography>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

/** Searches that were blocked or failed, each with the reason. */
export function JobFailures({ job }: Readonly<Props>) {
  const { t } = useTranslation();
  if (job.failures.length === 0) return null;
  return (
    <Alert severity="warning" data-testid={`job-failures-${job.id}`}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {t('crm.leadResearch.failedSearches', { count: job.failures.length })}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2 }}>
        {job.failures.map((failure) => (
          <Typography key={failure.id} component="li" variant="body2">
            {failure.message}
          </Typography>
        ))}
      </Box>
    </Alert>
  );
}
