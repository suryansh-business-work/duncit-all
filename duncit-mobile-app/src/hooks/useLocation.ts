import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getCurrentLocation, sendLocation } from '@/services/location.service';
import { useLocationStore } from '@/store/location.store';
import type { Coordinates } from '@/types/location';
import { toErrorMessage } from '@/utils/errors';

/**
 * Orchestrates the location feature: fetching coordinates (device) and
 * sending them to the backend (server mutation via TanStack Query).
 */
export function useLocation() {
  const { permission, coordinates, setLocation, setPermission } = useLocationStore();

  const fetchMutation = useMutation({
    mutationFn: getCurrentLocation,
    onSuccess: ({ permission: status, coordinates: coords }) => setLocation(status, coords),
    onError: () => setPermission('denied'),
  });

  const sendMutation = useMutation({
    mutationFn: (coords: Coordinates) => sendLocation(coords),
  });

  const fetchLocation = useCallback(() => fetchMutation.mutate(), [fetchMutation]);

  const submitLocation = useCallback(() => {
    if (coordinates) {
      sendMutation.mutate(coordinates);
    }
  }, [coordinates, sendMutation]);

  return {
    permission,
    coordinates,
    fetchLocation,
    submitLocation,
    isFetching: fetchMutation.isPending,
    isSending: sendMutation.isPending,
    sendResponse: sendMutation.data ?? null,
    error: fetchMutation.error
      ? toErrorMessage(fetchMutation.error)
      : sendMutation.error
        ? toErrorMessage(sendMutation.error)
        : null,
    canSend: Boolean(coordinates) && !sendMutation.isPending,
  };
}
