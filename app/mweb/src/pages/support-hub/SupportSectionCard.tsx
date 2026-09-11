import { Link as RouterLink } from 'react-router';
import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';
import type { SupportSection, SupportTone } from './sections';

interface Props {
  section: SupportSection;
}

const TONE_COLOR: Record<SupportTone, string> = {
  accent: 'secondary.main',
  danger: 'error.main',
};

/** A support tool tile: the icon on a soft disc, then the title. */
export default function SupportSectionCard({ section }: Readonly<Props>) {
  const { t } = useTranslation();
  const { Icon, tone, label, path, labelKey } = section;
  // Sections added since rule 38 carry keys; the older literals still render.
  const title = labelKey ? t(labelKey) : label;

  return (
    <Paper
      component={RouterLink}
      to={path}
      sx={{
        ...SURFACE_SX,
        p: 2,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: '100%',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: TONE_COLOR[tone],
          bgcolor: 'action.hover',
        }}
      >
        <Icon />
      </Box>
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.25 }}>{title}</Typography>
    </Paper>
  );
}
