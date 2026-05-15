import { Box, Badge, Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import type { ExploreFilters, ExplorePreset } from './exploreFilters';

interface ExploreHeaderProps {
  filters: ExploreFilters;
  setFilters: (filters: ExploreFilters) => void;
  activeCount: number;
  resultCount: number;
  onOpenFilters: () => void;
}

const PRESETS: Array<[ExplorePreset, string]> = [
  ['ALL', 'All'],
  ['TRENDING', 'Trending'],
  ['NEAR', 'Near me'],
  ['TONIGHT', 'Tonight'],
];

export default function ExploreHeader({ filters, setFilters, activeCount, resultCount, onOpenFilters }: ExploreHeaderProps) {
  return (
    <Stack spacing={1.1} sx={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 900, lineHeight: 1 }}>
              Explore
            </Typography>
            <Chip size="small" label={`${resultCount} live`} sx={{ height: 22, bgcolor: 'rgba(16,185,129,0.22)', color: '#7cf8ad', fontWeight: 900 }} />
          </Stack>
        </Box>
        <TextField
          size="small"
          placeholder="Search"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 0.75, fontSize: 16, color: '#fff' }} /> }}
          sx={{
            width: 118,
            '& .MuiOutlinedInput-root': {
              height: 34,
              borderRadius: 999,
              bgcolor: 'rgba(0,0,0,0.36)',
              color: '#fff',
              '& fieldset': { border: 0 },
            },
            '& input': { p: 0, fontSize: 12, fontWeight: 800 },
          }}
        />
        <IconButton onClick={onOpenFilters} sx={{ width: 36, height: 36, bgcolor: 'rgba(0,0,0,0.36)', color: '#fff' }} aria-label="Open filters">
          <Badge badgeContent={activeCount} color="primary" overlap="circular">
            <TuneIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Stack>
      <Box sx={{ overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Stack direction="row" spacing={0.8} sx={{ width: 'max-content' }}>
          {PRESETS.map(([value, label]) => {
            const selected = filters.preset === value;
            return (
              <Chip
                key={value}
                label={label}
                clickable
                onClick={() => setFilters({ ...filters, preset: value, date: value === 'TONIGHT' ? 'ALL' : filters.date })}
                sx={{
                  height: 36,
                  px: 0.75,
                  bgcolor: selected ? '#fff' : 'rgba(0,0,0,0.34)',
                  color: selected ? '#1f2937' : '#fff',
                  fontWeight: 900,
                  border: '1px solid rgba(255,255,255,0.16)',
                }}
              />
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}