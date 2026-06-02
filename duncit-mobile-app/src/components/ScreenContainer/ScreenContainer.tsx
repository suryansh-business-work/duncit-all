import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenContainerProps {
  children: ReactNode;
  testID?: string;
}

/** Safe-area aware page wrapper with consistent padding and background. */
export function ScreenContainer({ children, testID }: ScreenContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-brand-surface" testID={testID}>
      <View className="flex-1 gap-6 px-6 py-8">{children}</View>
    </SafeAreaView>
  );
}
