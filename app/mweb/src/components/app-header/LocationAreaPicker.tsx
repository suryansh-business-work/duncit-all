import { useMemo, useState } from 'react';
import {
  Box,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LayersIcon from '@mui/icons-material/Layers';
import PlaceIcon from '@mui/icons-material/Place';
import SearchIcon from '@mui/icons-material/Search';
import { alpha, type Theme } from '@mui/material/styles';
import { SURFACE_SX } from '../../theme';
import LocationSectionLabel from './LocationSectionLabel';
import { SHEET_SEARCH_SX } from './locationSheetSx';
import { useTranslation } from '../../i18n/useTranslation';

interface Zone {
  zone_name: string;
  pincode?: string | null;
  active_club_count?: number | null;
}

/** Compact per-locality club count, e.g. "3 clubs" / "No clubs yet". */
const zoneClubLabel = (count: number | null = 0) => {
  if (!count || count <= 0) return 'No clubs yet';
  return `${count} club${count === 1 ? '' : 's'}`;
};

/** One row of the grouped list: hairline between rows, inset past the icon
 * column's edge, and a soft green wash on the chosen one. */
const areaItemSx = (theme: Theme) => ({
  position: 'relative',
  borderRadius: 0,
  minHeight: 56,
  px: 2,
  py: 1.25,
  '&:not(:first-of-type)::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 16,
    right: 0,
    height: '1px',
    bgcolor: 'divider',
  },
  '&.Mui-selected, &.Mui-selected:hover': {
    bgcolor: alpha(theme.palette.primary.main, 0.12),
  },
});

const PRIMARY_TEXT = { variant: 'body2', noWrap: true, sx: { fontWeight: 600 } } as const;

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
  const { t } = useTranslation();
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

  return (
    <Box>
      <LocationSectionLabel>Locality / Area in {locationName}</LocationSectionLabel>
      {zones.length > 0 ? (
        <Stack spacing={1} sx={{ width: '100%' }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('mweb.appHeader.searchLocalityOrPinCode')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={SHEET_SEARCH_SX}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }
            }}
          />
          <Box sx={{ ...SURFACE_SX, width: '100%', maxHeight: 258, overflow: 'auto' }}>
            <List disablePadding sx={{ width: '100%' }}>
              <ListItemButton selected={!draftZone} onClick={() => setDraftZone('')} sx={areaItemSx}>
                <ListItemIcon sx={{ minWidth: 34, color: draftZone ? 'text.secondary' : 'primary.main' }}>
                  <LayersIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t('mweb.common.allAreas')}
                  secondary={`${zones.length} localities`}
                  slotProps={{ primary: PRIMARY_TEXT, secondary: { variant: 'caption' } }} />
                {!draftZone && <CheckCircleIcon color="primary" fontSize="small" />}
              </ListItemButton>
              {filteredZones.map((zone) => {
                const selected = draftZone === zone.zone_name;
                return (
                  <ListItemButton
                    key={zone.zone_name}
                    selected={selected}
                    onClick={() => setDraftZone(zone.zone_name)}
                    sx={areaItemSx}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: selected ? 'primary.main' : 'text.secondary' }}>
                      <PlaceIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={zone.zone_name}
                      secondary={[zoneClubLabel(zone.active_club_count), zone.pincode ? `PIN ${zone.pincode}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                      slotProps={{ primary: PRIMARY_TEXT, secondary: { variant: 'caption' } }} />
                    {selected && <CheckCircleIcon color="primary" fontSize="small" />}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
          {filteredZones.length === 0 && (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              No matching localities found.
            </Typography>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          This city has no localities configured.
        </Typography>
      )}
    </Box>
  );
}
