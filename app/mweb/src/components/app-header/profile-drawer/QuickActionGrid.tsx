import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { profileIcon } from './profileIcons';
import { PROFILE_GRID, type ProfileTile } from './profileSections';

function ActionTile({ tile, onNavigate }: Readonly<{ tile: ProfileTile; onNavigate: (to: string) => void }>) {
  return (
    <Paper
      variant="outlined"
      onClick={() => onNavigate(tile.to)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onNavigate(tile.to);
      }}
      sx={{
        p: 1.75,
        borderRadius: 3.5,
        cursor: 'pointer',
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.05) },
      }}
      aria-label={tile.label}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
          mb: 1.25,
        }}
      >
        {profileIcon(tile.icon)}
      </Box>
      <Typography fontWeight={800} noWrap>
        {tile.label}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap display="block">
        {tile.caption}
      </Typography>
    </Paper>
  );
}

export default function QuickActionGrid({ onNavigate }: Readonly<{ onNavigate: (to: string) => void }>) {
  return (
    <Box sx={{ px: 2.5, pb: 2 }}>
      <Stack direction="row" flexWrap="wrap" sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        {PROFILE_GRID.map((tile) => (
          <ActionTile key={tile.key} tile={tile} onNavigate={onNavigate} />
        ))}
      </Stack>
    </Box>
  );
}
