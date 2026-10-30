import type { ReactNode } from 'react';
import { Box, ButtonBase, Stack, Typography, keyframes } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import { ANIMATED_BRAND_GRADIENT_SX, REDUCED_MOTION } from '../../components/brandGradient';
import { RADIUS } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

/** Each role disc bobs on its own beat. */
const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

/** One of the ways to earn — hosting, a venue, a brand — as a floating disc. */
function RoleDisc({ icon, delay, offset }: Readonly<{ icon: ReactNode; delay: string; offset: number }>) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 36,
        height: 36,
        ml: offset,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: (theme) => alpha(theme.palette.common.white, 0.18),
        border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.35)}`,
        backdropFilter: 'blur(4px)',
        animation: `${bob} 3.2s ease-in-out ${delay} infinite`,
        '& svg': { fontSize: 20 },
        [REDUCED_MOTION]: { animation: 'none' },
      }}
    >
      {icon}
    </Box>
  );
}

/**
 * Earn with Duncit, on Home just above Previous Pods: one tap into the app's
 * Earn page (/earn), where hosting, venues, brands and freelancing are offered.
 * A gradient card that moves gently so it reads as something to try, not an
 * ad; the motion stops for people who ask for less. Native twin: EarnHomeCard.
 */
export default function EarnHomeCard({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const { t } = useTranslation();
  const title = t('mweb.meta.earn.title');

  return (
    <ButtonBase
      data-testid="home-earn-card"
      onClick={onOpen}
      aria-label={title}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: `${RADIUS.surface}px`,
        p: 2,
        ...ANIMATED_BRAND_GRADIENT_SX,
        boxShadow: 'var(--duncit-card-shadow)',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': { transform: 'translateY(-2px)' },
        '&:hover .earn-arrow': { transform: 'translateX(4px)' },
        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: 3 },
        [REDUCED_MOTION]: { animation: 'none', transition: 'none', '&:hover': { transform: 'none' } },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Stack direction="row" sx={{ flex: '0 0 auto' }}>
          <RoleDisc icon={<GroupsRoundedIcon />} delay="0s" offset={0} />
          <RoleDisc icon={<StorefrontRoundedIcon />} delay="0.4s" offset={-1} />
          <RoleDisc icon={<VolunteerActivismRoundedIcon />} delay="0.8s" offset={-1} />
        </Stack>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 13, lineHeight: 1.35, opacity: 0.9, mt: 0.25 }}>
            {t('mweb.meta.earn.description')}
          </Typography>
        </Box>
        <ArrowForwardRoundedIcon
          className="earn-arrow"
          aria-hidden
          sx={{ flex: '0 0 auto', transition: 'transform 180ms ease', [REDUCED_MOTION]: { transition: 'none' } }}
        />
      </Stack>
    </ButtonBase>
  );
}
