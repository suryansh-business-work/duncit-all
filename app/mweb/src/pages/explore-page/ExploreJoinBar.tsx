import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  expired: boolean;
  /** "₹199 · Confirm with UPI" / "Free spot" — the one line a live pod shows. */
  subtitle: string;
  goAriaLabel: string;
  onGo: () => void;
}

/**
 * The pill pinned above the bottom nav on every reel: the price line and a
 * green Go, or — for a pod that has already run — the expired notice with no
 * CTA. Native twin: components/explore/ExploreJoinBar.
 */
export default function ExploreJoinBar({ expired, subtitle, goAriaLabel, onGo }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={(theme) => ({
        alignItems: 'center',
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 'var(--duncit-bottom-nav-overlay-offset, 88px)',
        p: 0.75,
        pr: expired ? 2 : 0.75,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.common.black, 0.42),
        border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
        backdropFilter: 'blur(16px)',
      })}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flex: '0 0 auto',
          borderRadius: '50%',
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {expired ? <InfoOutlinedIcon sx={{ fontSize: 20 }} /> : <BoltRoundedIcon sx={{ fontSize: 20 }} />}
      </Box>
      {expired ? (
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.15 }} noWrap>
            {t('mweb.explore.thisPodIsExpired')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.82 }} noWrap>
            {t('mweb.explore.youCanStillViewThePodDetails')}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography sx={{ minWidth: 0, flex: 1, fontSize: '0.875rem', fontWeight: 600 }} noWrap>
            {subtitle}
          </Typography>
          <DuncitButton
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={onGo}
            sx={{ minHeight: 40, height: 40, px: 2 }}
            aria-label={goAriaLabel}
          >
            Go
          </DuncitButton>
        </>
      )}
    </Stack>
  );
}
