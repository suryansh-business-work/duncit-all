import { ActivityIndicator, Text, View } from 'react-native';

export interface LoadingIndicatorProps {
  label?: string;
  testID?: string;
}

/** Centered spinner with an optional label. */
export function LoadingIndicator({ label, testID }: LoadingIndicatorProps) {
  return (
    <View className="items-center gap-2" testID={testID}>
      <ActivityIndicator color="#2563EB" />
      {label ? <Text className="text-sm text-slate-300">{label}</Text> : null}
    </View>
  );
}
