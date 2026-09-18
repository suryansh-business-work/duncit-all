import { useId, useState } from 'react';
import { useLocation } from 'react-router';
import { Box, Dialog, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { DuncitButton } from '@duncit/buttons';

import { useNavigationData } from '../../../components/header/navigation';
import { StoreImage } from '../../../components/StoreImage';
import { STORAGE_KEYS, readStored, writeStored } from '../../../lib/storage';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { PagerDots } from './PagerDots';

const SLIDES = [
  { titleKey: 'ecommStore.onboarding.slide1Title', bodyKey: 'ecommStore.onboarding.slide1Body' },
  { titleKey: 'ecommStore.onboarding.slide2Title', bodyKey: 'ecommStore.onboarding.slide2Body' },
  { titleKey: 'ecommStore.onboarding.slide3Title', bodyKey: 'ecommStore.onboarding.slide3Body' },
] as const;

const BOT_AGENT = /bot|crawl|spider|slurp|preview|lighthouse|headless/i;

/** First visit to the home page only — never for a crawler, never on a deep link. */
function shouldShow(pathname: string): boolean {
  if (pathname !== '/') return false;
  if (readStored(STORAGE_KEYS.onboarded)) return false;
  const nav = globalThis.navigator;
  return !(nav?.webdriver || BOT_AGENT.test(nav?.userAgent ?? ''));
}

/** The "Smart Pet Care" welcome: three pages, a pager, and a pill "Let's go". */
export function OnboardingSplash() {
  const { t } = useStoreT();
  const { pathname } = useLocation();
  const { pet_types: pets } = useNavigationData();
  const [open, setOpen] = useState(() => shouldShow(pathname));
  const [page, setPage] = useState(0);
  const titleId = useId();
  const finish = () => {
    writeStored(STORAGE_KEYS.onboarded, '1');
    setOpen(false);
  };
  const last = page === SLIDES.length - 1;
  const slide = SLIDES[page];
  const image = pets[page % Math.max(pets.length, 1)]?.image_url ?? '';
  return (
    <Dialog fullScreen open={open} onClose={finish} aria-labelledby={titleId} slotProps={{ paper: { sx: { borderRadius: 0 } } }}>
      <Stack sx={{ minHeight: '100%', maxWidth: 520, mx: 'auto', width: '100%', p: 3 }} spacing={3}>
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={finish}>{t('ecommStore.onboarding.skip')}</DuncitButton>
        </Stack>
        <Box sx={{ bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, overflow: 'hidden' }}>
          <StoreImage src={image} alt="" width={480} height={360} eager sx={{ objectFit: 'cover' }} />
        </Box>
        <PagerDots count={SLIDES.length} active={page} label={t('ecommStore.onboarding.progress', { vars: { page: page + 1, total: SLIDES.length } })} />
        <Typography id={titleId} variant="h1" component="h2" sx={{ fontSize: { xs: '2.4rem', md: '3rem' } }}>
          {t(slide.titleKey)}
        </Typography>
        <Typography color="text.secondary">{t(slide.bodyKey)}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <DuncitButton
          variant="contained"
          size="large"
          endIcon={<ArrowForwardRoundedIcon />}
          onClick={last ? finish : () => setPage((p) => p + 1)}
          sx={{ bgcolor: T.navBar, '&:hover': { bgcolor: T.ink }, fontSize: '1.1rem', py: 1.5 }}
        >
          {last ? t('ecommStore.onboarding.start') : t('ecommStore.onboarding.next')}
        </DuncitButton>
      </Stack>
    </Dialog>
  );
}
