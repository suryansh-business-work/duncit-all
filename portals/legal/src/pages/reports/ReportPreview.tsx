import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { ContentReport } from '../../graphql/reports';

const VIDEO_RE = /\.(mp4|mov|webm)(\?|$)/i;

/**
 * What the reporter was looking at, as it was at report time.
 *
 * Deliberately the stored snapshot rather than a live lookup: a story is gone
 * in 24 hours and a reported post is the first thing its author deletes, so a
 * live view would show an empty box on exactly the reports that matter most.
 */
export default function ReportPreview({ report }: Readonly<{ report: ContentReport | null }>) {
  const { t } = useTranslation();
  const url = report?.target_preview_url ?? '';
  const isVideo = VIDEO_RE.test(url);

  if (!url) {
    return (
      <Box>
        <Typography variant="overline" color="text.secondary" fontWeight={700}>
          {t('reportLogs.detailPreview')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('reportLogs.detailPreviewMissing')}
        </Typography>
      </Box>
    );
  }

  const people = `${t('reportLogs.colOwner')}: ${report?.target_owner_name || '—'} · ${t('reportLogs.colReporter')}: ${report?.reporter_name || '—'}`;

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" fontWeight={700}>
        {t('reportLogs.detailPreview')}
      </Typography>
      <Stack spacing={0.75}>
        <Box
          component={isVideo ? 'video' : 'img'}
          src={url}
          controls={isVideo || undefined}
          alt={report?.target_caption || ''}
          sx={{
            width: '100%',
            maxHeight: 320,
            objectFit: 'contain',
            borderRadius: '16px',
            bgcolor: 'common.black',
          }}
        />
        {report?.target_caption && (
          <Typography variant="body2" color="text.secondary">
            {report.target_caption}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {people}
        </Typography>
      </Stack>
    </Box>
  );
}
