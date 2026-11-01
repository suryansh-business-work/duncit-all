import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Divider, LinearProgress, Link, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { BANNER_THEME_LABEL } from '../copy';
import { GENERATE_POD_BANNERS, type PodBannerSet } from '../banner.queries';
import type { PodBannerSlide } from '../queries';
import PodPicker from '../preview/PodPicker';
import BannerThemeSelect, { themeVariable, type ThemeChoice } from './BannerThemeSelect';
import BannerSizeSelect, { type SizeChoice } from './BannerSizeSelect';
import SlideGrid, { replaceSlide } from './SlideGrid';
import ScheduleSection from './ScheduleSection';

/** The pod the banners are for, by id and title. */
export interface BannerPod {
  id: string;
  title: string;
}

interface Props {
  open: boolean;
  /** Fixed when opened from a promotion; null lets the person pick one. */
  pod: BannerPod | null;
  /** The promotion's collaborators, when opened from one. */
  collaborators: string[] | null;
  canManage: boolean;
  onClose: () => void;
  /** A promotion was scheduled from here. */
  onScheduled: () => void;
}

/**
 * Make a pod's banner carousel in one click: pick the pod, a look and a size,
 * see every slide, download or re-render any one — and, for a manager,
 * schedule it as a promotion.
 */
export default function MakeBannersDialog({ open, pod, collaborators, canManage, onClose, onScheduled }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [picked, setPicked] = useState<BannerPod | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>('');
  const [size, setSize] = useState<SizeChoice>('');
  const [slides, setSlides] = useState<PodBannerSlide[]>([]);
  const [generate, { data, loading, error, reset }] = useMutation<{ generatePodBanners: PodBannerSet }>(GENERATE_POD_BANNERS);
  const target = pod ?? picked;
  const made = data?.generatePodBanners;

  const choose = (next: BannerPod) => {
    setPicked(next);
    setSlides([]);
    reset();
  };

  const run = async (forPod: BannerPod) => {
    const result = await generate({ variables: { pod_id: forPod.id, style: themeVariable(theme), size: size || null } });
    setSlides(result.data?.generatePodBanners.slides ?? []);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{target ? t('marketing.podPromo.bannersFor', { vars: { title: target.title } }) : t('marketing.podPromo.makeBanners')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {!pod && <PodPicker selectedId={picked?.id ?? null} onPick={(candidate) => choose({ id: candidate.id, title: candidate.title })} />}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <BannerThemeSelect value={theme} onChange={setTheme} disabled={loading} testId="banner-theme-select" />
            <BannerSizeSelect value={size} onChange={setSize} disabled={loading} />
            <DuncitButton
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              disabled={!target || loading}
              onClick={() => target && fireAndForget(run(target), logs.portal.marketing, 'pod-promos', 'generatePodBanners')}
              data-testid="banner-generate"
            >
              {slides.length > 0 ? t('marketing.podPromo.remakeBanners') : t('marketing.podPromo.makeBanners')}
            </DuncitButton>
          </Stack>
          <div aria-live="polite">
            {!target && (
              <Typography variant="body2" color="text.secondary">
                {t('marketing.podPromo.pickPodForBanners')}
              </Typography>
            )}
            {loading && <LinearProgress aria-label={t('marketing.podPromo.rendering')} />}
            {error && <Alert severity="error">{parseApiError(error)}</Alert>}
            {made && (
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                {t(BANNER_THEME_LABEL[made.style])}
                {' · '}
                {made.ai_copy ? t('marketing.podPromo.copyByAi') : t('marketing.podPromo.copyTemplate')}
                {' · '}
                <Link component={RouterLink} to="/activity?workflow=POD_PROMO">
                  {t('marketing.podPromo.seeRun', { vars: { id: made.run_id } })}
                </Link>
              </Typography>
            )}
          </div>
          {target && slides.length > 0 && (
            <SlideGrid slides={slides} podId={target.id} podTitle={target.title} theme={theme} size={size} onReplaced={(slide) => setSlides((current) => replaceSlide(current, slide))} />
          )}
          {canManage && target && slides.length > 0 && (
            <>
              <Divider />
              <ScheduleSection podId={target.id} podTitle={target.title} style={themeVariable(theme)} collaborators={collaborators} onScheduled={onScheduled} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
