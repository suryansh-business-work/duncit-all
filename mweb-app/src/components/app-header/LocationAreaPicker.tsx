import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface Zone {
  zone_name: string;
  pincode?: string | null;
}

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
}: Props) {
  const [query, setQuery] = useState('');
  const isGhaziabad = locationName.trim().toLowerCase() === 'ghaziabad';
  const filteredZones = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return zones;
    return zones.filter((zone) =>
      [zone.zone_name, zone.pincode].some((value) =>
        String(value ?? '').toLowerCase().includes(term)
      )
    );
  }, [query, zones]);

  return (
    <>
      <Typography variant="overline" color="text.secondary">
        Locality / Area in {locationName}
      </Typography>
      {isGhaziabad ? (
        <Stack spacing={1} sx={{ mt: 0.5, mb: 1, width: '100%' }}>
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
          />
          <Paper variant="outlined" sx={{ width: '100%', maxHeight: 320, overflow: 'auto' }}>
            <List disablePadding sx={{ width: '100%' }}>
              <ListItemButton selected={!draftZone} onClick={() => setDraftZone('')} divider>
                <ListItemText primary="All areas" secondary={`${zones.length} localities`} />
              </ListItemButton>
              {filteredZones.map((zone) => (
                <ListItemButton
                  key={zone.zone_name}
                  selected={draftZone === zone.zone_name}
                  onClick={() => setDraftZone(zone.zone_name)}
                  divider
                >
                  <ListItemText primary={zone.zone_name} secondary={zone.pincode || undefined} />
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
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5, mb: 1 }}>
          <Chip
            label="All areas"
            color={!draftZone ? 'primary' : 'default'}
            variant={!draftZone ? 'filled' : 'outlined'}
            onClick={() => setDraftZone('')}
          />
          {zones.map((zone) => (
            <Chip
              key={zone.zone_name}
              label={zone.zone_name}
              color={draftZone === zone.zone_name ? 'primary' : 'default'}
              variant={draftZone === zone.zone_name ? 'filled' : 'outlined'}
              onClick={() => setDraftZone(zone.zone_name)}
            />
          ))}
        </Stack>
      )}
      {zones.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          This city has no localities configured.
        </Typography>
      )}
    </>
  );
}