import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
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
    <Typography noWrap sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>
      Choose your location
    </Typography>
  );

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
          <DuncitButton variant="outlined" size="large" onClick={onClose} sx={{ flex: 1 }}>
            Cancel
          </DuncitButton>
          <DuncitButton
            variant="contained"
            size="large"
            onClick={onApply}
            disabled={!draftLocationId}
            sx={{ flex: 2 }}
          >
            {applyLabel}
          </DuncitButton>
        </Stack>
      }
      sheetMaxHeight="92vh"
      paperSx={{
        bgcolor: 'background.default',
        backgroundImage: 'none',
        borderTopLeftRadius: '28px',
        borderTopRightRadius: '28px',
      }}
      contentSx={{ px: 0, pt: 0, pb: 0 }}
      actionsSx={{ bgcolor: 'background.default', borderTop: 0, px: 2, py: 1.5 }}
    >
      <Stack spacing={2} sx={{ px: 2, pt: 1, pb: 1.5 }}>
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
      </Stack>
    </ResponsiveDialog>
  );
}
