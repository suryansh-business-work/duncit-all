import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * "Happening nearby" section header (mock): gradient flame badge, title, the
 * live pod count beneath, and a "See all →" pill. Extracted from HomePage for
 * the 200-line cap; both taps open the full nearby list.
 */
export default function HomeNearbyHeader({
  totalPods,
  onOpen,
}: Readonly<{ totalPods: number; onOpen: () => void }>) {
  const { t } = useTranslation();
  const podsLabel =
    totalPods === 1
      ? t('mweb.home.podsNearbyOne')
      : t('mweb.home.podsNearbyMany', { count: totalPods });

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        px: 0.25
      }}>
      <Stack
        direction="row"
        spacing={1}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        aria-label={t('mweb.home.happeningNearbyTitle')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onOpen();
        }}
        sx={{
          alignItems: "center",
          minWidth: 0,
          cursor: 'pointer'
        }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
            boxShadow: '0 8px 18px rgba(255,79,115,0.24)',
            flex: '0 0 auto',
          }}
        >
          <WhatshotIcon sx={{ fontSize: 17 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.15 }} noWrap>
            {t('mweb.home.happeningNearbyTitle')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
            {podsLabel}
          </Typography>
        </Box>
      </Stack>
      <DuncitButton
        size="small"
        endIcon={<ArrowForwardIcon />}
        onClick={onOpen}
        sx={{ fontWeight: 600, flex: '0 0 auto' }}
      >
        {t('mweb.home.seeAll')}
      </DuncitButton>
    </Stack>
  );
}
