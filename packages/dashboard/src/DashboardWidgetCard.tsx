import { Box, Card, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DRAG_HANDLE_CLASS } from './useGridStack';
import type { DashboardWidget } from './types';

type GripProps = Readonly<{ label: string; floating?: boolean }>;

/**
 * The one place a drag may start. GridStack is told to listen on this class, so
 * a click inside a chart, a table row or a button can never move the widget.
 */
function DragGrip({ label, floating }: GripProps) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        disableRipple
        aria-label={label}
        className={DRAG_HANDLE_CLASS}
        sx={{
          cursor: 'move',
          touchAction: 'none',
          color: 'text.secondary',
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
      </IconButton>
    </Tooltip>
  );
}

type HeaderProps = Readonly<{ widget: DashboardWidget; editing: boolean; dragLabel: string }>;

function WidgetHeader({ widget, editing, dragLabel }: HeaderProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ px: 2, pt: 1.5, pb: widget.subtitle ? 0.5 : 1 }}
    >
      {editing ? <DragGrip label={dragLabel} /> : null}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {widget.title ? (
          <Typography variant="subtitle1" fontWeight={800} noWrap>
            {widget.title}
          </Typography>
        ) : null}
        {widget.subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
 * and a body that scrolls inside its own slot rather than pushing the grid
 * around when its content outgrows the height the user gave it.
 */
export function DashboardWidgetCard({ widget, editing, dragLabel }: DashboardWidgetCardProps) {
  const body = (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        p: widget.disablePadding ? 0 : 2,
        pt: widget.bare || widget.disablePadding ? 0 : 1,
      }}
    >
      {widget.content}
    </Box>
  );

  if (widget.bare) {
    return (
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {editing ? <DragGrip label={dragLabel} floating /> : null}
        {body}
      </Box>
    );
  }

  const hasHeader = !!widget.title || !!widget.subtitle || !!widget.headerActions || editing;

  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {hasHeader ? <WidgetHeader widget={widget} editing={editing} dragLabel={dragLabel} /> : null}
      {body}
    </Card>
  );
}
