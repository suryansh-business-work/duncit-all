import { Box, Badge, Chip, IconButton, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import type { ExploreFilters } from './exploreFilters';

interface ExploreHeaderProps {
  filters: ExploreFilters;
  setFilters: (filters: ExploreFilters) => void;
  activeCount: number;
  resultCount: number;
  onOpenFilters: () => void;
}

export default function ExploreHeader({ activeCount, resultCount, onOpenFilters }: ExploreHeaderProps) {
  return (
    <Stack spacing={1.1} sx={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 900, lineHeight: 1 }}>
              Explore
            </Typography>
            <Chip
              size="small"
              label={`${resultCount} live`}
              sx={{ height: 22, bgcolor: 'rgba(16,185,129,0.22)', color: '#7cf8ad', fontWeight: 900 }}
            />
          </Stack>
        </Box>
        <IconButton
          onClick={onOpenFilters}
          sx={{ width: 40, height: 40, bgcolor: 'rgba(0,0,0,0.42)', color: '#fff', backdropFilter: 'blur(8px)' }}
          aria-label="Open filters"
        >
          <Badge badgeContent={activeCount} color="primary" overlap="circular">
            <TuneIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Stack>
    </Stack>
  );
}