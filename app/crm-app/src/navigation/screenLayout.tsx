import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { ErrorBoundary } from '@/components/ErrorBoundary';

interface LayoutArgs {
  children: ReactNode;
  route: { name: string };
}

/**
 * Every screen sits in its own error boundary (rule: a page failure never
 * crashes the app) — passed to each navigator as `screenLayout`.
 */
export function screenLayout({ children, route }: LayoutArgs) {
  return (
    <ErrorBoundary scope="page" route={route.name}>
      {children}
    </ErrorBoundary>
  );
}

function AboveSystemBar({ children }: Readonly<{ children: ReactNode }>) {
  const { bottom } = useSafeAreaInsets();
  return (
    <YStack flex={1} paddingBottom={bottom} testID="screen-above-system-bar">
      {children}
    </YStack>
  );
}

/**
 * A pushed stack screen. Android draws the app edge to edge, so without this a
 * screen's last buttons ran under the system navigation bar (and the iPhone
 * home indicator). The tab screens use `screenLayout`: the tab bar already
 * sits above that bar.
 */
export function stackScreenLayout(args: LayoutArgs) {
  return <AboveSystemBar>{screenLayout(args)}</AboveSystemBar>;
}
