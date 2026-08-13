import { Box, Skeleton, Stack } from '@mui/material';
import { normalisePosition } from './layout';
import { DashboardWidgetCard } from './DashboardWidgetCard';
import type { DashboardLayoutItem, DashboardWidget } from './types';

/**
 * How GridStack's own chrome is themed. gridstack.css addresses these elements
 * as `.grid-stack > .grid-stack-item > …` (three classes), so every selector
 * here leads with `&.grid-stack` — one class more — or the override silently
 * loses the specificity contest, which is exactly how the stock rotated-arrow
 * resize glyph used to bleed through the intended corner bracket.
 */
const GRID_SX = {
  '&.grid-stack > .grid-stack-placeholder > .placeholder-content': {
    border: '2px dashed',
    borderColor: 'primary.main',
    borderRadius: 2,
    bgcolor: 'action.hover',
  },
  // GridStack draws corner handles as a rotated arrow glyph; replace that with
  // a plain corner bracket. The handle elements only exist while editing, so
  // "always visible" here still means "only in edit mode".
  '&.grid-stack > .grid-stack-item > .ui-resizable-se, &.grid-stack > .grid-stack-item > .ui-resizable-sw':
    {
      backgroundImage: 'none',
      transform: 'none',
      width: 18,
      height: 18,
      bottom: 10,
      borderBottom: '3px solid',
      borderColor: 'primary.main',
      opacity: 0.55,
      transition: 'opacity .15s',
    },
  '&.grid-stack > .grid-stack-item > .ui-resizable-se': {
    right: 10,
    borderRight: '3px solid',
    borderRightColor: 'primary.main',
    borderBottomRightRadius: 6,
  },
  '&.grid-stack > .grid-stack-item > .ui-resizable-sw': {
    left: 10,
    borderLeft: '3px solid',
    borderLeftColor: 'primary.main',
    borderBottomLeftRadius: 6,
  },
  '&.grid-stack > .grid-stack-item:hover > .ui-resizable-handle': { opacity: 1 },
} as const;

export type DashboardGridProps = Readonly<{
  widgets: readonly DashboardWidget[];
  /** Resolved slots, or null while the saved layout is still unknown. */
  layout: DashboardLayoutItem[] | null;
  editing: boolean;
  dragLabel: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}>;

/** Placeholder cards in the dashboard's default shape while the layout loads. */
function GridSkeleton({ widgets }: Readonly<{ widgets: readonly DashboardWidget[] }>) {
  return (
    <Stack spacing={2}>
      {widgets.map((widget) => (
        <Skeleton
          key={widget.id}
          variant="rounded"
          height={Math.max(80, normalisePosition(widget.defaultLayout).h * 76)}
        />
      ))}
    </Stack>
  );
}

/**
 * The GridStack DOM. React owns the item elements and their contents; GridStack
 * owns where they sit, which is why the `gs-*` attributes here are only ever
 * the STARTING slot — every later move goes through the grid instance.
 */
export function DashboardGrid({
  widgets,
  layout,
  editing,
  dragLabel,
  containerRef,
}: DashboardGridProps) {
  if (!layout) return <GridSkeleton widgets={widgets} />;

  const slots = new Map(layout.map((item) => [item.id, item]));

  return (
    <Box ref={containerRef} className="grid-stack" sx={GRID_SX}>
      {widgets.map((widget) => {
        const slot = slots.get(widget.id) ?? normalisePosition(widget.defaultLayout);
        const size = normalisePosition(widget.defaultLayout);
        return (
          <div
            key={widget.id}
            className="grid-stack-item"
            gs-id={widget.id}
            gs-x={slot.x}
            gs-y={slot.y}
            gs-w={slot.w}
            gs-h={slot.h}
            gs-min-w={widget.minW ?? Math.min(size.w, 3)}
            gs-min-h={widget.minH ?? Math.min(size.h, 2)}
            gs-size-to-content={widget.fitContent ? 'true' : undefined}
          >
            <div className="grid-stack-item-content">
              <DashboardWidgetCard widget={widget} editing={editing} dragLabel={dragLabel} />
            </div>
          </div>
        );
      })}
    </Box>
  );
}
