import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';

import { useLocations } from '@/hooks/useLocations';
import { buildLocationTree } from '@/utils/location-tree';
import type { LocationItem } from '@/stores/location.store';

/** Draft country/state/city/zone selection + GPS detection for the location
 * picker. Mirrors mWeb's drilldown (apply-on-confirm, GPS sets the draft). */
export function useLocationDraft(open: boolean, onClose: () => void) {
  const { locations, select, selectedId } = useLocations();
  const tree = useMemo(() => buildLocationTree(locations), [locations]);

  const [draftId, setDraftId] = useState('');
  const [draftZone, setDraftZone] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState('');
  const [error, setError] = useState('');

  // Re-sync the drilldown to the active selection each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    const loc = locations.find((l) => l.id === selectedId);
    setDraftId(selectedId);
    setDraftZone('');
    setDetected('');
    setError('');
    setCountry(loc?.country?.trim() || tree[0]?.country || '');
    setState(loc?.state?.trim() || tree[0]?.states[0]?.state || '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftLoc = locations.find((l) => l.id === draftId);
  const activeCountry = tree.find((c) => c.country === country) ?? tree[0];
  const activeState =
    activeCountry?.states.find((s) => s.state === state) ?? activeCountry?.states[0];
  const cities = activeState?.cities ?? [];
  const zones = draftLoc?.location_zones ?? [];

  const pickCountry = (next: string) => {
    setCountry(next);
    setState(tree.find((c) => c.country === next)?.states[0]?.state ?? '');
  };

  const pickCity = (loc: LocationItem) => {
    setDraftId(loc.id);
    setDraftZone('');
  };

  const apply = () => {
    if (!draftLoc) return;
    select(draftLoc, draftZone);
    onClose();
  };

  const matchCity = (city: string) =>
    locations.find(
      (l) =>
        l.city?.toLowerCase() === city.toLowerCase() ||
        l.location_name.toLowerCase() === city.toLowerCase(),
    );

  const detect = async () => {
    setError('');
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission is needed to detect your city.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const city = geo?.city ?? geo?.subregion ?? '';
      setDetected(city);
      const match = matchCity(city);
      if (!match) {
        setError(`Duncit isn't in ${city || 'your area'} yet. Pick a city below.`);
        return;
      }
      const zone =
        match.location_zones?.find((z) => z.pincode && z.pincode === geo?.postalCode)?.zone_name ??
        '';
      setCountry(match.country?.trim() || '');
      setState(match.state?.trim() || '');
      setDraftId(match.id);
      setDraftZone(zone);
    } catch {
      setError('Could not detect your location.');
    } finally {
      setBusy(false);
    }
  };

  return {
    tree,
    cities,
    zones,
    draftId,
    draftZone,
    draftLoc,
    country: activeCountry?.country ?? '',
    state: activeState?.state ?? '',
    busy,
    detected,
    error,
    pickCountry,
    setState,
    pickCity,
    setDraftZone,
    detect,
    apply,
  };
}
