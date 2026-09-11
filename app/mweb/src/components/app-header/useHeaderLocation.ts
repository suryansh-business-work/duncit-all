import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  APPLY_LOCATION_EVENT,
  OPEN_LOCATION_PICKER_EVENT,
  SET_MY_SELECTED_LOCATION,
  type ApplyLocationDetail,
} from './queries';
import type { LocationLike } from '../../utils/location-tree';

interface Options {
  me?: { selected_location_id?: string | null; city?: string | null } | null;
  meSettled: boolean;
  locations: LocationLike[];
  selectedLocationId: string;
  selectedZoneName: string;
  onLocationChange: (id: string) => void;
  onZoneChange: (zone: string) => void;
}

/**
 * The header's location half: the default city once `me` has answered, the
 * picker's draft, persisting a real pick, and the two window events other
 * screens use to open the picker or apply a city outright. Moved out of
 * AppHeader (over the line cap) unchanged — call it before the header's own
 * super-category default so both defaults still land in one commit.
 */
export function useHeaderLocation({
  me,
  meSettled,
  locations,
  selectedLocationId,
  selectedZoneName,
  onLocationChange,
  onZoneChange,
}: Readonly<Options>) {
  const [persistSelectedLocation] = useMutation<any>(SET_MY_SELECTED_LOCATION, {
    onError: () => undefined,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftLocationId, setDraftLocationId] = useState('');
  const [draftZone, setDraftZone] = useState('');

  // Persist an explicit location choice so it sticks across sessions/devices.
  // The auto-default below does NOT persist — only a real user pick does.
  const persistLocation = useCallback(
    (id: string) => {
      if (!id || id === me?.selected_location_id) return;
      persistSelectedLocation({ variables: { locationId: id } }).catch(() => undefined);
    },
    [persistSelectedLocation, me?.selected_location_id]
  );

  // Both defaults wait for `me`, so they land in ONE commit: each re-keys the
  // page (App.tsx), and landing apart would remount Home twice.
  useEffect(() => {
    if (meSettled && !selectedLocationId && locations.length > 0) {
      // Prefer the user's persisted choice; then a city match; then the first.
      const persisted = locations.find((l) => l.id === me?.selected_location_id);
      const city = me?.city?.toLowerCase();
      const cityMatch = city
        ? locations.find((l) => l.location_name?.toLowerCase() === city)
        : undefined;
      onLocationChange(persisted?.id ?? cityMatch?.id ?? locations[0].id);
    }
  }, [meSettled, locations, selectedLocationId, me, onLocationChange]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId),
    [locations, selectedLocationId]
  );

  const openLocationPicker = useCallback(() => {
    setDraftLocationId(selectedLocationId);
    setDraftZone(selectedZoneName);
    setDialogOpen(true);
  }, [selectedLocationId, selectedZoneName]);

  // Open the picker when another screen (e.g. the Clubs page note) asks for it.
  useEffect(() => {
    globalThis.addEventListener(OPEN_LOCATION_PICKER_EVENT, openLocationPicker);
    return () => globalThis.removeEventListener(OPEN_LOCATION_PICKER_EVENT, openLocationPicker);
  }, [openLocationPicker]);

  // Apply a city + area another screen chose outright — the "Switch to …"
  // button on a pod, club or venue reached from a link into another city. It
  // lands exactly where a pick in the dialog would: state, then persisted.
  useEffect(() => {
    const applyLocation = (event: Event) => {
      const { locationId, zoneName } = (event as CustomEvent<ApplyLocationDetail>).detail;
      onLocationChange(locationId);
      onZoneChange(zoneName);
      persistLocation(locationId);
    };
    globalThis.addEventListener(APPLY_LOCATION_EVENT, applyLocation);
    return () => globalThis.removeEventListener(APPLY_LOCATION_EVENT, applyLocation);
  }, [onLocationChange, onZoneChange, persistLocation]);

  /** The props the header's LocationDialog takes besides the location lists. */
  const dialog = {
    open: dialogOpen,
    onClose: () => setDialogOpen(false),
    draftLocationId,
    setDraftLocationId,
    draftZone,
    setDraftZone,
    // Apply: commit the draft, persist it, close.
    onApply: () => {
      onLocationChange(draftLocationId);
      onZoneChange(draftZone);
      persistLocation(draftLocationId);
      setDialogOpen(false);
    },
    // A GPS match with live pods: commit it outright and close.
    onAutoApply: (locationId: string, zoneName: string) => {
      setDraftLocationId(locationId);
      setDraftZone(zoneName);
      onLocationChange(locationId);
      onZoneChange(zoneName);
      persistLocation(locationId);
      setDialogOpen(false);
    },
  };

  return { selectedLocation, openLocationPicker, dialog };
}
