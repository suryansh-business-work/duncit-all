import { useCallback, useState } from 'react';

import type { Coordinates, LocationPermissionStatus } from '@/types/location';

export interface LocationState {
  permission: LocationPermissionStatus;
  coordinates: Coordinates | null;
}

const initialState: LocationState = {
  permission: 'undetermined',
  coordinates: null,
};

/**
 * Lightweight local store for the captured location.
 * Server state (mutations) is owned by TanStack Query; this only holds device state.
 */
export function useLocationStore() {
  const [state, setState] = useState<LocationState>(initialState);

  const setLocation = useCallback(
    (permission: LocationPermissionStatus, coordinates: Coordinates) =>
      setState({ permission, coordinates }),
    [],
  );

  const setPermission = useCallback(
    (permission: LocationPermissionStatus) => setState((prev) => ({ ...prev, permission })),
    [],
  );

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, setLocation, setPermission, reset };
}
