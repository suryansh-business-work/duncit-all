import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { formatDay } from '@duncit/datetime';
import { gigBudgetText, gigEventTypeKey, gigPosterRoleKey, gigStatusKey, type GigJob } from '@duncit/utils';

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

/** What the gig is: title, roles, when, where, budget, openings and the poster's words. */
export default function GigJobFacts({ job }: Readonly<{ job: GigJob }>) {
  const { t } = useTranslation();
  const when = job.event_date ? formatDay(job.event_date.slice(0, 10)) : t('gigJobs.card.noDate');
  const where = [job.location, job.city].filter(Boolean).join(', ');

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Chip size="small" label={t(gigStatusKey(job.status))} color={job.status === 'OPEN' ? 'success' : 'default'} />
        <Chip size="small" label={t(gigEventTypeKey(job.event_type))} />
      </Stack>
      <Typography variant="h5" component="h1">
        {job.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('gigJobs.card.postedBy', { vars: { name: job.poster_name, role: t(gigPosterRoleKey(job.poster_role)) } })}
      </Typography>

      <Stack spacing={1}>
        <Typography variant="subtitle2" component="h2">
          {t('gigJobs.detail.roles')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {job.roles.map((role) => (
            <Chip key={role} label={role} variant="outlined" />
          ))}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
        <Fact label={t('gigJobs.detail.category')} value={job.category_title} />
        <Fact label={t('gigJobs.detail.when')} value={when} />
        <Fact label={t('gigJobs.detail.where')} value={where} />
        <Fact label={t('gigJobs.detail.budget')} value={gigBudgetText(job.budget) ?? t('gigJobs.card.budgetOpen')} />
        <Fact label={t('gigJobs.detail.openings')} value={String(job.openings)} />
      </Stack>

      {job.description && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" component="h2">
            {t('gigJobs.detail.about')}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {job.description}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
