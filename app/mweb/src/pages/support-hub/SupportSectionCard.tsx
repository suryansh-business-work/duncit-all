import { Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Stack, Typography, alpha } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { SupportSection } from './sections';

interface Props {
  section: SupportSection;
}

export default function SupportSectionCard({ section }: Readonly<Props>) {
  const { Icon, color, label, description, path } = section;

  return (
    <Paper
      component={RouterLink}
      to={path}
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: 4,
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
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            color,
            bgcolor: alpha(color, 0.14),
          }}
        >
          <Icon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ color }}>
          <Typography variant="caption" sx={{ fontWeight: 900 }}>
            Open
          </Typography>
          <ChevronRightIcon fontSize="small" />
        </Stack>
      </Stack>
    </Paper>
  );
}
