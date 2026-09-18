import { Box, Card, Stack, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ArrangeMenu } from './ArrangeMenu';
import { DRAG_HANDLE_CLASS } from './useGridStack';
import type { DashboardArrange, DashboardWidget } from './types';

type GripProps = Readonly<{ label: string }>;

/**
 * The visible "drag me" affordance.
 *
 * Deliberately NOT a <button>: GridStack discards any mousedown that lands
 * inside `input, textarea, button, select…` (its skipMouseDown list) unless the
 * target IS the registered handle element — and a mousedown on an icon button
 * targets the <svg> inside it, never the button. Rendered as an IconButton this
 * grip looks draggable while every drag on it silently dies.
 */
function DragGrip({ label }: GripProps) {
  return (
    <Tooltip title={label}>
      <Box
        role="img"
        aria-label={label}
        className={DRAG_HANDLE_CLASS}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0.5,
          borderRadius: 1,
          cursor: 'move',
          touchAction: 'none',
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
    </Tooltip>
  );
}

/** A bare section has no header, so its edit controls float over its corner. */
const FLOATING_SX = {
  position: 'absolute',
  top: 4,
  right: 4,
  zIndex: 2,
  alignItems: 'center',
  borderRadius: 1,
  bgcolor: 'background.paper',
  boxShadow: 1,
} as const;

type HeaderProps = Readonly<{
  widget: DashboardWidget;
  editing: boolean;
  dragLabel: string;
  arrange?: DashboardArrange;
}>;

/**
 * While editing, the whole header row is a drag handle, not just the grip — a
 * 24px grip is a miserable drag target. Buttons inside `headerActions` stay
 * clickable: GridStack's skip list refuses drags that start on them.
 */
function WidgetHeader({ widget, editing, dragLabel, arrange }: HeaderProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      className={editing ? DRAG_HANDLE_CLASS : undefined}
      sx={{
        alignItems: "center",
        px: 2,
        pt: 1.5,
        pb: widget.subtitle ? 0.5 : 1,
        ...(editing && { cursor: 'move', touchAction: 'none', userSelect: 'none' })
      }}>
      {editing ? <DragGrip label={dragLabel} /> : null}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {widget.title ? (
          <Typography variant="subtitle1" component="h2" noWrap sx={{
            fontWeight: 800
          }}>
            {widget.title}
          </Typography>
        ) : null}
        {widget.subtitle ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block'
            }}>
            {widget.subtitle}
          </Typography>
        ) : null}
      </Box>
      {widget.headerActions}
      {editing && arrange ? <ArrangeMenu widget={widget} arrange={arrange} /> : null}
    </Stack>
  );
}

export type DashboardWidgetCardProps = Readonly<{
  widget: DashboardWidget;
  editing: boolean;
  /** Localised label for the grip, so the package holds no literal copy. */
  dragLabel: string;
  /** The non-drag way to move and resize — offered while editing when given. */
  arrange?: DashboardArrange;
}>;

/**
 * The uniform chrome every dashboard panel wears: surface, header, drag grip,
 * and a body.
 *
 * Two height regimes. A fixed-slot widget fills 100% of the slot the user gave
 * it and scrolls inside when its content outgrows that. A `fitContent` widget
 * is the opposite: GridStack measures this card to decide the slot's height, so
 * the card must be its natural size — nothing here may stretch or scroll, or
 * the measurement reads back the very height it is supposed to produce.
 */
export function DashboardWidgetCard({ widget, editing, dragLabel, arrange }: DashboardWidgetCardProps) {
  const fit = !!widget.fitContent;

  const body = (
    <Box
      sx={{
        p: widget.disablePadding ? 0 : 2,
        pt: widget.bare || widget.disablePadding ? 0 : 1,
        ...(!fit && { flex: 1, minHeight: 0, overflow: 'auto' }),
      }}
    >
      {widget.content}
    </Box>
  );

  if (widget.bare) {
    return (
      <Box
        sx={{
          position: 'relative',
          ...(!fit && { height: '100%', display: 'flex', flexDirection: 'column' }),
        }}
      >
        {editing ? (
          <Stack direction="row" sx={FLOATING_SX}>
            <DragGrip label={dragLabel} />
            {arrange ? <ArrangeMenu widget={widget} arrange={arrange} /> : null}
          </Stack>
        ) : null}
        {body}
      </Box>
    );
  }

  const hasHeader = !!widget.title || !!widget.subtitle || !!widget.headerActions || editing;

  return (
    // A titled widget is a named region of the dashboard, under its h2.
    <Card
      variant="outlined"
      component="section"
      aria-label={widget.title}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...(!fit && { height: '100%' }),
      }}
    >
      {hasHeader ? (
        <WidgetHeader widget={widget} editing={editing} dragLabel={dragLabel} arrange={arrange} />
      ) : null}
      {body}
    </Card>
  );
}
