import { useCallback } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import ResponsiveDialog from '../ResponsiveDialog';
import GpsLocationPicker from './GpsLocationPicker';
import LocationAreaPicker from './LocationAreaPicker';
import LocationCityCard from './LocationCityCard';

interface Props {
  open: boolean;
  onClose: () => void;
  locations: any[];
  draftLocationId: string;
  setDraftLocationId: (id: string) => void;
  draftZone: string;
  setDraftZone: (z: string) => void;
  onApply: () => void;
}

export default function LocationDialog({
  open,
  onClose,
  locations,
  draftLocationId,
  setDraftLocationId,
  draftZone,
  setDraftZone,
  onApply,
}: Props) {
  const draftLoc = locations.find((l: any) => l.id === draftLocationId);
  const zones: { zone_name: string; pincode?: string | null }[] = draftLoc?.location_zones ?? [];
  const popularLocationId = locations.reduce((best: any | null, location: any) => {
    if (!best) return location;
    return (location.location_zones?.length ?? 0) > (best.location_zones?.length ?? 0)
      ? location
      : best;
  }, null)?.id;
  const applyLabel = draftZone
    ? `Apply - ${draftZone}`
    : zones.length
      ? `Apply - ${zones.length} areas`
      : 'Apply';

  const handleAutoSelect = useCallback(
    (locationId: string, zoneName: string) => {
      setDraftLocationId(locationId);
      setDraftZone(zoneName);
    },
    [setDraftLocationId, setDraftZone]
  );

  const title = (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
      <PlaceIcon color="primary" fontSize="small" />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
          Choose your city{draftZone ? ' / area' : ''}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', lineHeight: 1.25 }}
        >
          Pods and clubs are filtered by this selection.
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
          <Button color="error" onClick={onClose} sx={{ fontWeight: 800 }}>
            Cancel
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            onClick={onApply}
            disabled={!draftLocationId}
            sx={{ minWidth: 154, borderRadius: 999, fontWeight: 800 }}
          >
            {applyLabel}
          </Button>
        </Stack>
      }
      sheetMaxHeight="92vh"
    >
      <GpsLocationPicker locations={locations} onAutoSelect={handleAutoSelect} />

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, lineHeight: 1.4 }}>
        City
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: 'minmax(84px, 31%)', sm: 'minmax(122px, 1fr)' },
          gap: 1,
          mt: 0.5,
          mb: 1.5,
          pb: 0.5,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {locations.map((locationItem: any, index: number) => {
          const active = locationItem.id === draftLocationId;
          return (
            <LocationCityCard
              key={locationItem.id}
              location={locationItem}
              active={active}
              popular={!active && locationItem.id === popularLocationId}
              index={index}
              onSelect={() => {
                setDraftLocationId(locationItem.id);
                setDraftZone('');
              }}
            />
          );
        })}
        {locations.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No locations available
          </Typography>
        )}
      </Box>

      {draftLoc && (
        <LocationAreaPicker
          locationName={draftLoc.location_name}
          zones={zones}
          draftZone={draftZone}
          setDraftZone={setDraftZone}
        />
      )}
    </ResponsiveDialog>
  );
}
