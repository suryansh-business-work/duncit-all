import { useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import { Box, Link, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../shared/i18n';
import { HEADLINE_GRADIENT, HEADLINE_GRADIENT_LIGHT, LITE_RADII } from '../../../shared/tokens';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { paths } from '../../lib/paths';
import { FloatingCovers } from './FloatingCovers';

/** The headline's lines arrive one after another. */
const STAGGER: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const RISE: Variants = { hidden: { opacity: 0, y: 24 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

const gradient = ([from, to]: readonly [string, string]) => `linear-gradient(90deg, ${from}, ${to})`;

/**
 * The words that carry the gradient, Duncit's red into amber (deeper stops on the light page).
 * backgroundImage, never the background shorthand: the light override comes later, and a
 * shorthand there resets background-clip, painting a solid gradient block over the words.
 */
export const gradientText = (theme: Theme) => ({
  backgroundImage: gradient(HEADLINE_GRADIENT),
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  ...theme.applyStyles('light', { backgroundImage: gradient(HEADLINE_GRADIENT_LIGHT) }),
});

/** The site name, "Delightful events / start here", one line of why, and the two ways in. */
export function Hero({ covers }: Readonly<{ covers: readonly string[] }>) {
  const { t } = useWebT();
  const { site_name: siteName } = useLiteSettings();
  const { requireSignIn } = useSignInPrompt();
  const navigate = useNavigate();
  const create = async () => {
    if (await requireSignIn()) navigate(paths.create);
  };
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  // 0 with the hero at the top of the screen, 1 once it has scrolled away.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const textFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const coversY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  return (
    <Box component="section" ref={heroRef} aria-labelledby="landing-title" sx={{ position: 'relative', minHeight: { xs: 560, md: 680 }, display: 'grid', placeItems: 'center', px: 2, overflow: 'hidden' }} data-testid="landing-hero">
      {/* Scroll-linked depth is motion too: with reduced motion on, nothing moves with the scroll. */}
      <motion.div style={{ position: 'absolute', inset: 0, ...(reduceMotion ? {} : { y: coversY }) }}>
        <FloatingCovers covers={covers} />
      </motion.div>
      <motion.div variants={STAGGER} initial="hidden" animate="shown" style={{ position: 'relative', ...(reduceMotion ? {} : { y: textY, opacity: textFade }) }}>
        <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 560 }}>
          <Typography component={motion.p} variants={RISE} variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
            {siteName}
          </Typography>
          <Typography id="landing-title" component={motion.h1} variants={RISE} variant="h1">
            {t('liteWeb.landing.titleLead')}
            <Box component="span" sx={(theme) => ({ display: 'block', ...gradientText(theme) })}>
              {t('liteWeb.landing.titleAccent')}
            </Box>
          </Typography>
          <Typography component={motion.p} variants={RISE} color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.15rem' }, maxWidth: 440 }}>
            {t('liteWeb.landing.body')}
          </Typography>
          <Box component={motion.div} variants={RISE} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <DuncitButton
              variant="contained"
              size="large"
              onClick={() => {
                create().catch((error: unknown) => notifyError(parseApiError(error)));
              }}
              sx={{ borderRadius: LITE_RADII.pill, px: 3 }}
              data-testid="landing-create"
            >
              {t('liteWeb.landing.ctaCreate')}
            </DuncitButton>
          </Box>
          <Box component={motion.div} variants={RISE}>
            <Link component={RouterLink} to={paths.discover} underline="hover" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }} data-testid="landing-discover">
              {t('liteWeb.landing.ctaDiscover')}
              <ArrowForwardIcon sx={{ fontSize: 16 }} aria-hidden />
            </Link>
          </Box>
        </Stack>
      </motion.div>
    </Box>
  );
}
