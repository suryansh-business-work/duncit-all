import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Separator, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';

/**
 * A grouped list of menu rows: an optional section title, then one surface
 * card with a hairline between rows, inset 16 so it never touches the edges.
 * Absent children (a flag-gated row) simply drop out, divider and all. mWeb
 * twin: profile-drawer/MenuGroup.
 */
export function SidebarGroup({
  title,
  testID,
  children,
}: Readonly<{ title?: string; testID?: string; children: ReactNode }>) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <YStack paddingHorizontal={16} paddingBottom={12} gap={8} testID={testID}>
      {title ? <SectionHeader title={title} /> : null}
      <SurfaceCard padding={0} overflow="hidden">
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 ? <Separator borderColor="$borderColor" marginHorizontal={16} /> : null}
            {row}
          </Fragment>
        ))}
      </SurfaceCard>
    </YStack>
  );
}
