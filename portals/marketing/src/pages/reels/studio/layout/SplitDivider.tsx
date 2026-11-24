import { Box } from '@mui/material';
import type { DividerProps } from 'react-split-pane';
import { useTranslation } from '@duncit/shell';

/** The divider's thickness; the split view is told it so pane sizes add up. */
export const DIVIDER_SIZE = 6;

/**
 * The bar between two panes, drawn from the theme rather than the split
 * library's stylesheet. It is a focusable window splitter: arrow keys resize
 * (Shift for bigger steps), Home and End go to the limits, and a screen reader
 * hears the size it is at and the limits it moves between.
 */
export default function SplitDivider({ direction, isDragging, disabled, onPointerDown, onKeyDown, currentSize, minSize, maxSize, index }: DividerProps) {
  const { t } = useTranslation();
  const sideBySide = direction === 'horizontal';

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- false positive: a focusable separator is the ARIA window-splitter widget (APG), which takes drags and arrow keys
    <Box
      role="separator"
      tabIndex={disabled ? -1 : 0}
      aria-orientation={sideBySide ? 'vertical' : 'horizontal'}
      aria-valuenow={currentSize === undefined ? undefined : Math.round(currentSize)}
      aria-valuemin={minSize === undefined ? undefined : Math.round(minSize)}
      aria-valuemax={maxSize === undefined || !Number.isFinite(maxSize) ? undefined : Math.round(maxSize)}
      aria-label={t('ai.reels.layout.resize')}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      data-testid={`reel-split-divider-${direction}-${index}`}
      sx={{
        flex: `0 0 ${DIVIDER_SIZE}px`,
        cursor: sideBySide ? 'col-resize' : 'row-resize',
        touchAction: 'none',
        bgcolor: isDragging ? 'primary.main' : 'divider',
        transition: (theme) => theme.transitions.create('background-color', { duration: theme.transitions.duration.shortest }),
        // The ring itself is the page-wide focus ring every [tabindex] gets.
        '&:hover, &:focus-visible': { bgcolor: 'primary.light' },
      }}
    />
  );
}
