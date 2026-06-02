import { Text, View } from 'react-native';

import type { Coordinates, LocationPermissionStatus, SendLocationResponse } from '@/types/location';

export interface LocationPanelProps {
  permission: LocationPermissionStatus;
  coordinates: Coordinates | null;
  isFetching: boolean;
  sendResponse: SendLocationResponse | null;
  error: string | null;
}

function Row({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View className="flex-row justify-between border-b border-white/10 py-3">
      <Text className="text-sm text-slate-400">{label}</Text>
      <Text className="text-sm font-medium text-white" testID={testID}>
        {value}
      </Text>
    </View>
  );
}

/** Read-only summary of permission, coordinates, loading, response and error state. */
export function LocationPanel({
  permission,
  coordinates,
  isFetching,
  sendResponse,
  error,
}: LocationPanelProps) {
  return (
    <View className="rounded-2xl bg-white/5 px-4">
      <Row label="Permission" value={permission} testID="permission-status" />
      <Row label="Loading" value={isFetching ? 'Fetching…' : 'Idle'} testID="loading-state" />
      <Row
        label="Latitude"
        value={coordinates ? coordinates.latitude.toFixed(6) : '—'}
        testID="latitude-value"
      />
      <Row
        label="Longitude"
        value={coordinates ? coordinates.longitude.toFixed(6) : '—'}
        testID="longitude-value"
      />
      <Row
        label="API response"
        value={sendResponse ? `Saved (${sendResponse.id})` : '—'}
        testID="api-response"
      />
      {error ? (
        <Text className="py-3 text-sm font-medium text-red-400" testID="error-state">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
