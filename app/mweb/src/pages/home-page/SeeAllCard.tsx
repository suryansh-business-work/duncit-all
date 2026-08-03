import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
        width,
        minHeight: 180,
        flex: '0 0 auto',
        alignSelf: 'stretch',
        borderRadius: '16px',
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        scrollSnapAlign: 'start',
      }}
    >
      <Stack alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <ArrowForwardIcon />
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('mweb.home.seeAll')}
        </Typography>
        {count !== undefined && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t('mweb.home.morePods', { count })}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
