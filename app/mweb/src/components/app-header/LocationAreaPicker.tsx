import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { alpha, type Theme } from '@mui/material/styles';

interface Zone {
  zone_name: string;
  pincode?: string | null;
  active_club_count?: number | null;
}

/** Compact per-locality club count, e.g. "3 clubs" / "No clubs yet". */
const zoneClubLabel = (count?: number | null) => {
  const n = count ?? 0;
  if (n <= 0) return 'No clubs yet';
  return `${n} club${n === 1 ? '' : 's'}`;
};

interface Props {
  locationName: string;
  zones: Zone[];
  draftZone: string;
  setDraftZone: (zone: string) => void;
}

export default function LocationAreaPicker({
  locationName,
  zones,
  draftZone,
  setDraftZone,
}: Readonly<Props>) {
  const [query, setQuery] = useState('');
  const filteredZones = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return zones;
    return zones.filter((zone) =>
      [zone.zone_name, zone.pincode].some((value) =>
        String(value ?? '').toLowerCase().includes(term)
      )
    );
  }, [query, zones]);

  const areaItemSx = (theme: Theme) => ({
    border: 1,
    borderColor: 'divider',
    borderRadius: 2,
    minHeight: 54,
    px: 1.25,
    py: 0.8,
    mb: 0.75,
    bgcolor: 'background.paper',
    '&.Mui-selected': {
      borderColor: alpha(theme.palette.primary.main, 0.55),
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
    },
    '&.Mui-selected:hover, &:hover': {
      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
    },
    '&:last-of-type': { mb: 0 },
  });

  return (
    <>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, lineHeight: 1.4 }}>
        Locality / Area in {locationName}
      </Typography>
      {zones.length > 0 ? (
        <Stack spacing={0.8} sx={{ mt: 0.25, mb: 1, width: '100%' }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search locality or PIN code"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                minHeight: 40,
                borderRadius: 2,
                bgcolor: 'action.hover',
              },
              '& input': { fontSize: 13 },
            }}
          />
          <Paper elevation={0} sx={{ width: '100%', maxHeight: 258, overflow: 'auto', bgcolor: 'transparent' }}>
            <List disablePadding sx={{ width: '100%' }}>
              <ListItemButton selected={!draftZone} onClick={() => setDraftZone('')} sx={areaItemSx}>
                <ListItemIcon sx={{ minWidth: 34, color: 'primary.main' }}>
                  <LayersOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="All areas"
                  secondary={`${zones.length} localities`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 800, noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                {!draftZone && <CheckRoundedIcon color="primary" fontSize="small" />}
              </ListItemButton>
              {filteredZones.map((zone) => (
                <ListItemButton
                  key={zone.zone_name}
                  selected={draftZone === zone.zone_name}
                  onClick={() => setDraftZone(zone.zone_name)}
                  sx={areaItemSx}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
                    <PlaceOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={zone.zone_name}
                    secondary={[zoneClubLabel(zone.active_club_count), zone.pincode ? `PIN ${zone.pincode}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {draftZone === zone.zone_name && <CheckRoundedIcon color="primary" fontSize="small" />}
                </ListItemButton>
              ))}
            </List>
          </Paper>
          {filteredZones.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No matching localities found.
            </Typography>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          This city has no localities configured.
        </Typography>
      )}
    </>
  );
}