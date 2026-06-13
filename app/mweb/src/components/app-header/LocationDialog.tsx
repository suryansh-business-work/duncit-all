import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import PlaceIcon from '@mui/icons-material/Place';
import ResponsiveDialog from '../ResponsiveDialog';
import GpsLocationPicker from './GpsLocationPicker';
import CountryStatePicker from './CountryStatePicker';
import LocationCityGrid from './LocationCityGrid';
import LocationAreaPicker from './LocationAreaPicker';
import LocationMapPreview from './LocationMapPreview';
import { buildLocationTree, type LocationLike } from '../../utils/location-tree';

interface Props {
  open: boolean;
  onClose: () => void;
  locations: LocationLike[];
  activeLocationIds?: string[];
  draftLocationId: string;
  setDraftLocationId: (id: string) => void;
  draftZone: string;
  setDraftZone: (z: string) => void;
  onApply: () => void;
  onAutoApply?: (locationId: string, zoneName: string) => void;
}

export default function LocationDialog({
  open,
  onClose,
  locations,
  activeLocationIds,
  draftLocationId,
  setDraftLocationId,
  draftZone,
  setDraftZone,
  onApply,
  onAutoApply,
}: Readonly<Props>) {
  const tree = useMemo(() => buildLocationTree(locations), [locations]);
  const draftLoc = locations.find((l) => l.id === draftLocationId);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');

  // Sync the drilldown to the active selection whenever the dialog (re)opens.
  useEffect(() => {
    if (!open) return;
    setCountry(draftLoc?.country?.trim() || tree[0]?.country || '');
    setState(draftLoc?.state?.trim() || tree[0]?.states[0]?.state || '');
  }, [open, draftLocationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCountry = tree.find((c) => c.country === country) ?? tree[0];
  const activeState =
    activeCountry?.states.find((s) => s.state === state) ?? activeCountry?.states[0];
  const cities = activeState?.cities ?? [];
  const zones = draftLoc?.location_zones ?? [];

  // Selecting a fresh city clears the stale locality/area selection (BUG-3).
  const selectFirstCity = (cities: LocationLike[]) => {
    const firstCity = cities[0];
    if (firstCity) {
      setDraftLocationId(firstCity.id);
      setDraftZone('');
    }
  };

  const handleCountry = (next: string) => {
    setCountry(next);
    const first = tree.find((c) => c.country === next)?.states[0];
    setState(first?.state ?? '');
    selectFirstCity(first?.cities ?? []);
  };

  // Changing the state must reset the city so the area picker loads the new
  // state's localities instead of keeping the previous city's (BUG-3).
  const handleState = (next: string) => {
    setState(next);
    selectFirstCity(activeCountry?.states.find((s) => s.state === next)?.cities ?? []);
  };

  const handleCity = (id: string) => {
    setDraftLocationId(id);
    setDraftZone('');
  };

  const handleAutoSelect = useCallback(
    (locationId: string, zoneName: string) => {
      const loc = locations.find((l) => l.id === locationId);
      if (loc) {
        setCountry(loc.country?.trim() || '');
        setState(loc.state?.trim() || '');
      }
      setDraftLocationId(locationId);
      setDraftZone(zoneName);
    },
    [locations, setDraftLocationId, setDraftZone]
  );

  const zonesLabel = zones.length ? `Apply · ${zones.length} areas` : 'Apply';
  const applyLabel = draftZone ? `Apply · ${draftZone}` : zonesLabel;

  const title = (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
          border: 1,
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
        }}
      >
        <PlaceIcon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }} noWrap>
          Choose your location
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.25 }}>
          Country, state, city &amp; area — pods are filtered by this.
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
      paperSx={{
        bgcolor: 'background.default',
        backgroundImage: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 14% 0%, rgba(255,79,115,0.22), transparent 28%), linear-gradient(180deg, #130d08 0%, #090a12 20%, #0c0d16 100%)'
            : 'radial-gradient(circle at 16% 0%, rgba(255,79,115,0.18), transparent 30%), linear-gradient(180deg, #fff7f2 0%, #ffffff 28%, #fff 100%)',
      }}
      contentSx={{ px: 0, pt: 0, pb: 0 }}
      actionsSx={{
        bgcolor: (theme) =>
          alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.92),
        backdropFilter: 'blur(16px)',
      }}
    >
      <Box sx={{ px: 2, pt: 0.75, pb: 1.5 }}>
        <GpsLocationPicker
          locations={locations}
          activeLocationIds={activeLocationIds}
          onAutoSelect={handleAutoSelect}
          onAutoApply={onAutoApply}
        />
        <CountryStatePicker
          tree={tree}
          country={activeCountry?.country ?? ''}
          state={activeState?.state ?? ''}
          onCountry={handleCountry}
          onState={handleState}
        />
        <LocationCityGrid cities={cities} draftLocationId={draftLocationId} onSelect={handleCity} />
        {draftLoc && (
          <LocationAreaPicker
            locationName={draftLoc.location_name}
            zones={zones}
            draftZone={draftZone}
            setDraftZone={setDraftZone}
          />
        )}
        <LocationMapPreview
          city={draftLoc?.city || draftLoc?.location_name}
          zoneName={draftZone}
          pincode={draftLoc?.location_pincode}
          country={draftLoc?.country}
        />
      </Box>
    </ResponsiveDialog>
  );
}
