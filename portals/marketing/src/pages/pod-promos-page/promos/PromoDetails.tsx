import { Link as RouterLink } from 'react-router';
import { Alert, Chip, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { BANNER_THEME_LABEL } from '../copy';
import type { PodPromo } from '../queries';
import SlideStrip from '../banners/SlideStrip';
import TrackingLink from './TrackingLink';

/** The banner, the words of the post, its tracking link, and where the post and pod live. */
export default function PromoDetails({ promo }: Readonly<{ promo: PodPromo }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const when = (iso: string | null) => (iso ? formatDateTime(new Date(iso)) : t('marketing.podPromo.notScheduled'));

  return (
    <Stack spacing={2} data-testid="promo-details">
      {promo.error && <Alert severity="error">{promo.error}</Alert>}
      <Typography variant="body2" color="text.secondary">
        {t('marketing.podPromo.startsAt', { vars: { when: when(promo.pod_start) } })}
        {' · '}
        {t('marketing.podPromo.postsAt', { vars: { when: when(promo.scheduled_at) } })}
      </Typography>
      <SlideStrip slides={promo.slides} podTitle={promo.pod_title} />
      <Typography variant="caption" color="text.secondary" data-testid="promo-theme">
        {t(BANNER_THEME_LABEL[promo.style])}
        {promo.collaborators.length > 0 &&
          ` · ${t('marketing.social.withCollaborators', { vars: { handles: promo.collaborators.map((handle) => `@${handle}`).join(', ') } })}`}
      </Typography>
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          {promo.ai_caption ? t('marketing.podPromo.captionByAi') : t('marketing.podPromo.captionTemplate')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} data-testid="promo-caption">
          {promo.caption || t('marketing.podPromo.noCaption')}
        </Typography>
      </Stack>
      {promo.hashtags.length > 0 && (
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {promo.hashtags.map((tag) => (
            <Chip key={tag} size="small" label={`#${tag.replace(/^#/, '')}`} />
          ))}
        </Stack>
      )}
      {promo.tracking_url && <TrackingLink url={promo.tracking_url} />}
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {promo.scheduled_post_id && (
          <Link component={RouterLink} to="/publish/calendar">
            {t('marketing.podPromo.openCalendar')}
          </Link>
        )}
        {promo.permalink && (
          <Link href={promo.permalink} target="_blank" rel="noopener noreferrer">
            {t('marketing.podPromo.openPost')}
            <OpenInNewIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle' }} aria-hidden />
          </Link>
        )}
        {promo.pod_url && (
          <Link href={promo.pod_url} target="_blank" rel="noopener noreferrer">
            {t('marketing.podPromo.openPod')}
            <OpenInNewIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle' }} aria-hidden />
          </Link>
        )}
      </Stack>
    </Stack>
  );
}
