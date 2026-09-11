import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react';
import { YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';

/** True for anything rendered inside a RowGroup — a row there drops its own
 * surface, because the group already draws the card and the dividers. */
const InRowGroupContext = createContext(false);

/** Whether the calling row sits inside a RowGroup card. */
export function useInRowGroup(): boolean {
  return useContext(InRowGroupContext);
}

interface Props {
  children: ReactNode;
  /** For a card that must stand out, e.g. the drafts about to be deleted. */
  borderColor?: string;
  testID?: string;
}

/**
 * One card of list rows with hairline dividers inset 16 between them — the calm
 * list group, instead of a stack of one-card-per-row boxes. Conditional rows
 * are fine: only the rows actually rendered are counted. mWeb twin:
 * host-manage-page/RowGroup.
 */
export function RowGroup({ children, borderColor, testID }: Readonly<Props>) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <InRowGroupContext.Provider value>
      <SurfaceCard
        testID={testID}
        padding={0}
        overflow="hidden"
        borderColor={borderColor ?? '$cardBorder'}
      >
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 ? (
              <YStack height={1} marginHorizontal={16} backgroundColor="$borderColor" />
            ) : null}
            {row}
          </Fragment>
        ))}
      </SurfaceCard>
    </InRowGroupContext.Provider>
  );
}
