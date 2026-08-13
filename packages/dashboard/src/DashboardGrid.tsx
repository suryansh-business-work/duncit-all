import { Box, Skeleton, Stack } from '@mui/material';
import { normalisePosition } from './layout';
import { DashboardWidgetCard } from './DashboardWidgetCard';
import type { DashboardLayoutItem, DashboardWidget } from './types';

/**
 * How GridStack's own chrome is themed. Its stylesheet positions the items; the
 * placeholder and the resize grip are ours, so they follow the MUI palette in
 * both colour modes instead of GridStack's fixed grey.
 */
const GRID_SX = {
  '& .grid-stack-item-content': { inset: 0, overflow: 'visible' },
  '& .grid-stack-placeholder > .placeholder-content': {
    border: '2px dashed',
    borderColor: 'primary.main',
    borderRadius: 2,
    bgcolor: 'action.hover',
  },
  '& .ui-resizable-handle': { opacity: 0, transition: 'opacity .15s' },
  '&:not(.grid-stack-static) .grid-stack-item:hover .ui-resizable-handle': { opacity: 1 },
  '& .ui-resizable-se': {
    width: 16,
    height: 16,
    right: 2,
    bottom: 2,
    borderRight: '2px solid',
    borderBottom: '2px solid',
    borderColor: 'primary.main',
    borderBottomRightRadius: 4,
  },
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
