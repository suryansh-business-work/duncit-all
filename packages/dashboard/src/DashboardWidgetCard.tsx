import { Box, Card, Stack, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DRAG_HANDLE_CLASS } from './useGridStack';
import type { DashboardWidget } from './types';

type GripProps = Readonly<{ label: string; floating?: boolean }>;

/**
 * The visible "drag me" affordance.
 *
 * Deliberately NOT a <button>: GridStack discards any mousedown that lands
 * inside `input, textarea, button, select…` (its skipMouseDown list) unless the
 * target IS the registered handle element — and a mousedown on an icon button
 * targets the <svg> inside it, never the button. Rendered as an IconButton this
 * grip looks draggable while every drag on it silently dies.
 */
function DragGrip({ label, floating }: GripProps) {
  return (
    <Tooltip title={label}>
      <Box
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
          ...(floating && {
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 2,
            bgcolor: 'background.paper',
            boxShadow: 1,
          }),
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
    </Tooltip>
  );
}

type HeaderProps = Readonly<{ widget: DashboardWidget; editing: boolean; dragLabel: string }>;

/**
 * While editing, the whole header row is a drag handle, not just the grip — a
 * 24px grip is a miserable drag target. Buttons inside `headerActions` stay
 * clickable: GridStack's skip list refuses drags that start on them.
 */
function WidgetHeader({ widget, editing, dragLabel }: HeaderProps) {
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
          <Typography variant="subtitle1" noWrap sx={{
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
    </Stack>
  );
}

export type DashboardWidgetCardProps = Readonly<{
  widget: DashboardWidget;
  editing: boolean;
  /** Localised label for the grip, so the package holds no literal copy. */
  dragLabel: string;
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
export function DashboardWidgetCard({ widget, editing, dragLabel }: DashboardWidgetCardProps) {
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
        {editing ? <DragGrip label={dragLabel} floating /> : null}
        {body}
      </Box>
    );
  }

  const hasHeader = !!widget.title || !!widget.subtitle || !!widget.headerActions || editing;

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...(!fit && { height: '100%' }),
      }}
    >
      {hasHeader ? <WidgetHeader widget={widget} editing={editing} dragLabel={dragLabel} /> : null}
      {body}
    </Card>
  );
}
