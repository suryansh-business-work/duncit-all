import type { ReactNode } from 'react';
import { Text } from 'tamagui';

/** A group label inside the location sheet (Country, State, City, Area, Map):
 * small muted caps, the same on every group. mWeb twin:
 * app-header/LocationSectionLabel. */
export function SectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Text fontSize={12} fontWeight="600" color="$muted" letterSpacing={0.8}>
      {children}
    </Text>
  );
}
