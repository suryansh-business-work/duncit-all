import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** How many more entries the full page holds beyond the rail's cap. Omitted
   * when a vibe chip / filter is active — the full page is unfiltered, so a
   * filtered count would lie. */
  count?: number;
  width: number;
  onClick: () => void;
}

/** Trailing rail card that continues the rail on its full-list page, landing
 * right after the last entry shown here (rule-27 twin of native SeeAllCard). */
export default function SeeAllCard({ count, width, onClick }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={t('mweb.home.seeAll')}
      data-testid="see-all-card"
      sx={{
        ...SURFACE_SX,
        width,
        minHeight: 180,
        flex: '0 0 auto',
        alignSelf: 'stretch',
        p: 0,
        cursor: 'pointer',
        font: 'inherit',
        color: 'text.primary',
        display: 'grid',
        placeItems: 'center',
        scrollSnapAlign: 'start',
      }}
    >
      <Stack spacing={1} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'secondary.main',
          }}
        >
          <ArrowForwardIcon />
        </Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t('mweb.home.seeAll')}</Typography>
        {count !== undefined && (
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
            {t('mweb.home.morePods', { count })}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
