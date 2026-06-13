import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';

import { useLocations } from '@/hooks/useLocations';
import { buildLocationTree } from '@/utils/location-tree';
import { matchLocation, matchZone } from '@/utils/location-match';
import type { LocationItem } from '@/stores/location.store';

/** Draft country/state/city/zone selection + GPS detection for the location
 * picker. Mirrors mWeb's drilldown (apply-on-confirm, GPS sets the draft). */
export function useLocationDraft(open: boolean, onClose: () => void) {
  const { locations, activeLocationIds, select, selectedId } = useLocations();
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

  // Selecting a fresh city clears the stale locality/area selection (BUG-3).
  const selectFirstCity = (stateCities: LocationItem[]) => {
    const first = stateCities[0];
    if (!first) return;
    setDraftId(first.id);
    setDraftZone('');
  };

  const pickCountry = (next: string) => {
    setCountry(next);
    const firstState = tree.find((c) => c.country === next)?.states[0];
    setState(firstState?.state ?? '');
    selectFirstCity(firstState?.cities ?? []);
  };

  // Changing the state must reset the city so the area list loads the new
  // state's localities instead of keeping the previous city's (BUG-3).
  const pickState = (next: string) => {
    setState(next);
    selectFirstCity(activeCountry?.states.find((s) => s.state === next)?.cities ?? []);
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
      const match = matchLocation(locations, city, geo?.postalCode);
      if (!match) {
        setError(`Duncit isn't in ${city || 'your area'} yet. Pick a city below.`);
        return;
      }
      const zone = matchZone(match, geo?.postalCode);
      setCountry(match.country?.trim() || '');
      setState(match.state?.trim() || '');
      setDraftId(match.id);
      setDraftZone(zone);
      // Live pods here → commit and go straight to Home; otherwise prompt to pick.
      if (activeLocationIds.includes(match.id)) {
        select(match, zone);
        onClose();
      } else {
        setError(`No live pods in ${match.location_name} right now. Pick a city below.`);
      }
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
    setState: pickState,
    pickCity,
    setDraftZone,
    detect,
    apply,
  };
}
