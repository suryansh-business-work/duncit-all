import { useMutation } from '@apollo/client/react';
import { Box, Card, CardActions, CardContent, Link, LinearProgress, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SLIDE_KIND_LABEL } from '../copy';
import type { PodBannerSlide } from '../queries';
import { REGENERATE_POD_BANNER_SLIDE } from '../banner.queries';
import { themeVariable, type ThemeChoice } from './BannerThemeSelect';
import type { SizeChoice } from './BannerSizeSelect';

interface Props {
  slide: PodBannerSlide;
  podId: string;
  podTitle: string;
  theme: ThemeChoice;
  size: SizeChoice;
  /** The slide was rendered again; the grid swaps the new one in. */
  onReplaced: (slide: PodBannerSlide) => void;
}

/** One slide: the picture, what it is, a download, and a re-render of just this one. */
export default function SlideTile({ slide, podId, podTitle, theme, size, onReplaced }: Readonly<Props>) {
  const { t } = useTranslation();
  const [regenerate, { loading }] = useMutation<{ regeneratePodBannerSlide: PodBannerSlide }>(REGENERATE_POD_BANNER_SLIDE);
  const kind = t(SLIDE_KIND_LABEL[slide.kind]);

  const again = async () => {
    try {
      const result = await regenerate({ variables: { pod_id: podId, kind: slide.kind, style: themeVariable(theme), size: size || null } });
      if (result.data) onReplaced(result.data.regeneratePodBannerSlide);
      notify(t('marketing.podPromo.slideRegenerated', { vars: { kind } }), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Card variant="outlined" data-testid={`banner-slide-${slide.kind}`}>
      <Box
        component="img"
        src={slide.url}
        alt={t('marketing.podPromo.slideAlt', { vars: { kind, title: podTitle } })}
        sx={{ display: 'block', width: '100%', bgcolor: 'action.hover' }}
      />
      {loading && <LinearProgress aria-label={t('marketing.podPromo.slideRendering', { vars: { kind } })} />}
      <CardContent sx={{ pb: 0 }}>
        <Typography variant="subtitle2" component="h3">
          {kind}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Link href={slide.url} download target="_blank" rel="noopener noreferrer" aria-label={t('marketing.podPromo.downloadSlide', { vars: { kind } })}>
          <DownloadIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} aria-hidden />
          {t('marketing.podPromo.download')}
        </Link>
        <DuncitButton
          size="small"
          startIcon={<RefreshIcon />}
          disabled={loading}
          onClick={() => fireAndForget(again(), logs.portal.marketing, 'pod-promos', 'regeneratePodBannerSlide')}
          aria-label={t('marketing.podPromo.regenerateSlide', { vars: { kind } })}
          data-testid={`banner-slide-regenerate-${slide.kind}`}
        >
          {t('marketing.podPromo.regenerateShort')}
        </DuncitButton>
      </CardActions>
    </Card>
  );
}
