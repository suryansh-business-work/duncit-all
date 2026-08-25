import { Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Stack, Typography, alpha } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from '../../i18n/useTranslation';
import type { SupportSection } from './sections';

interface Props {
  section: SupportSection;
}

export default function SupportSectionCard({ section }: Readonly<Props>) {
  const { t } = useTranslation();
  const { Icon, color, label, description, path, labelKey, descriptionKey } = section;
  // Sections added since rule 38 carry keys; the older literals still render.
  const title = labelKey ? t(labelKey) : label;
  const caption = descriptionKey ? t(descriptionKey) : description;

  return (
    <Paper
      component={RouterLink}
      to={path}
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: '16px',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        height: '100%',
        transition: 'all 160ms ease',
        '&:hover': { borderColor: color, bgcolor: alpha(color, 0.06) },
      }}
    >
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color,
            bgcolor: alpha(color, 0.14),
          }}
        >
          <Icon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {caption}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            alignItems: "center",
            color
          }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Open
          </Typography>
          <ChevronRightIcon fontSize="small" />
        </Stack>
      </Stack>
    </Paper>
  );
}
