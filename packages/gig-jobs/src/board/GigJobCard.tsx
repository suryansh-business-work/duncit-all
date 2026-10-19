import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { useTranslation } from '@duncit/app-settings';
import { formatDay } from '@duncit/datetime';
import { gigBudgetText, gigEventTypeKey, gigJobPath, gigPosterRoleKey, gigStatusKey, type GigJobRow } from '@duncit/utils';
import { useGigSurface } from '../GigSurfaceProvider';

const MAX_ROLE_CHIPS = 3;

/** One gig on the board or in My posts — the whole card opens the gig. */
export default function GigJobCard({ job }: Readonly<{ job: GigJobRow }>) {
  const { t } = useTranslation();
  const { go } = useGigSurface();
  const budget = gigBudgetText(job.budget) ?? t('gigJobs.card.budgetOpen');
  const date = job.event_date ? formatDay(job.event_date.slice(0, 10)) : t('gigJobs.card.noDate');
  const extraRoles = job.roles.length - MAX_ROLE_CHIPS;

  return (
    <Card variant="outlined" data-testid={`gig-card-${job.id}`}>
      <CardActionArea onClick={() => go(gigJobPath(job.id))}>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Chip size="small" color="primary" variant="outlined" label={job.category_title} />
              <Chip size="small" label={t(gigEventTypeKey(job.event_type))} />
              {job.status !== 'OPEN' && <Chip size="small" label={t(gigStatusKey(job.status))} />}
              {job.is_mine && <Chip size="small" color="secondary" label={t('gigJobs.card.mine')} />}
              {job.viewer_interested && <Chip size="small" color="success" label={t('gigJobs.card.shared')} />}
            </Stack>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
              {job.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {job.roles.slice(0, MAX_ROLE_CHIPS).join(' · ')}
              {extraRoles > 0 ? ` +${extraRoles}` : ''}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5, color: 'text.secondary' }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <EventOutlinedIcon fontSize="small" aria-hidden />
                <Typography variant="body2">{date}</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <PlaceOutlinedIcon fontSize="small" aria-hidden />
                <Typography variant="body2">{job.city}</Typography>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {budget}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('gigJobs.card.openings', { count: job.openings })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('gigJobs.card.interested', { count: job.interest_count })}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {t('gigJobs.card.postedBy', { vars: { name: job.poster_name, role: t(gigPosterRoleKey(job.poster_role)) } })}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
