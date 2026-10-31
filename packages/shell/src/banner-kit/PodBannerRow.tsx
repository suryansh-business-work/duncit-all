import { useMutation } from '@apollo/client/react';
import { Alert, Box, Grid, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DownloadIcon from '@mui/icons-material/Download';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { createLogger, fireAndForget } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import { GENERATE_POD_BANNERS } from './queries';

const logger = createLogger('portal');

export interface BannerPod {
  id: string;
  pod_title: string;
  pod_date_time: string;
}

interface GeneratedBanners {
  generatePodBanners: {
    run_id: string;
    style: string;
    slides: { url: string; kind: string }[];
  };
}

/** One upcoming pod, its Make banners button, and the slides once they are made — each a link to download. */
export function PodBannerRow({ pod }: Readonly<{ pod: BannerPod }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [generate, { data, loading, error }] = useMutation<GeneratedBanners>(GENERATE_POD_BANNERS);
  const slides = data?.generatePodBanners.slides ?? [];

  const make = async () => {
    await generate({ variables: { pod_id: pod.id } });
    notifySuccess(t('shell.podBanners.made'));
  };

  return (
    <Stack spacing={1.5} data-testid={`pod-banners-${pod.id}`}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" component="h3">
            {pod.pod_title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDateTime(pod.pod_date_time)}
          </Typography>
        </Stack>
        <DuncitButton
          size="small"
          variant={slides.length > 0 ? 'outlined' : 'contained'}
          startIcon={<AutoAwesomeIcon />}
          loading={loading}
          onClick={() => fireAndForget(make(), logger, 'PodBannersPanel', 'generatePodBanners')}
          data-testid={`pod-banners-make-${pod.id}`}
        >
          {slides.length > 0 ? t('shell.podBanners.remake') : t('shell.podBanners.make')}
        </DuncitButton>
      </Stack>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {slides.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('shell.podBanners.slideCount', { vars: { count: slides.length } })}
          </Typography>
          <Grid container spacing={1.5}>
            {slides.map((slide, index) => (
              <Grid key={slide.url} size={{ xs: 6, sm: 4, md: 3 }}>
                <Stack spacing={0.75}>
                  <Box
                    component="img"
                    src={slide.url}
                    alt={t('shell.podBanners.slideAlt', { vars: { n: index + 1, title: pod.pod_title } })}
                    sx={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover' }}
                  />
                  <DuncitButton
                    size="small"
                    component="a"
                    href={slide.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<DownloadIcon />}
                  >
                    {t('shell.podBanners.download', { vars: { n: index + 1 } })}
                  </DuncitButton>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}
    </Stack>
  );
}
