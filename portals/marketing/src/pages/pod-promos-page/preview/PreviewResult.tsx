import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { BANNER_STYLE_LABEL, BANNER_THEME_LABEL } from '../copy';
import type { PodPromoPreview } from '../queries';
import SlideStrip from '../banners/SlideStrip';

/** The carousel and caption made for one pod, and when (or why not) the planner would post it. */
export default function PreviewResult({ preview }: Readonly<{ preview: PodPromoPreview }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

  return (
    <Stack spacing={1.5} data-testid="preview-result">
      {preview.ineligible_reason ? (
        <Alert severity="warning">{preview.ineligible_reason}</Alert>
      ) : (
        <Alert severity="info">
          {preview.scheduled_at
            ? t('marketing.podPromo.wouldPostAt', { vars: { when: formatDateTime(new Date(preview.scheduled_at)) } })
            : t('marketing.podPromo.tooClose')}
        </Alert>
      )}
      <SlideStrip slides={preview.slides} podTitle={preview.pod_title} />
      <Typography variant="caption" color="text.secondary">
        {t(BANNER_THEME_LABEL[preview.style])}
        {' · '}
        {t(BANNER_STYLE_LABEL[preview.banner_style])}
        {' · '}
        {preview.ai_caption ? t('marketing.podPromo.captionByAi') : t('marketing.podPromo.captionTemplate')}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} data-testid="preview-caption">
        {preview.caption}
      </Typography>
      {preview.collaborators.length > 0 && (
        <Typography variant="caption" color="text.secondary" data-testid="preview-collaborators">
          {t('marketing.social.withCollaborators', { vars: { handles: preview.collaborators.map((handle) => `@${handle}`).join(', ') } })}
        </Typography>
      )}
      {preview.hashtags.length > 0 && (
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {preview.hashtags.map((tag) => (
            <Chip key={tag} size="small" label={`#${tag.replace(/^#/, '')}`} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
