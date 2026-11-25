import type { ReactNode } from 'react';
import { Box, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Pane, SplitPane } from 'react-split-pane';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PANE_LIMITS, PANE_ORDER, dockedRow, type PaneId } from './layoutModel';
import PaneFrame from './PaneFrame';
import PaneWindow from './PaneWindow';
import SplitDivider, { DIVIDER_SIZE } from './SplitDivider';
import type { StudioLayoutState } from './useStudioLayout';

export interface PaneContent {
  title: string;
  content: ReactNode;
  /** The guided tour's anchor for this pane, if it has one. */
  tour?: string;
}

interface Props {
  state: StudioLayoutState;
  panes: Readonly<Record<PaneId, PaneContent>>;
}

/** On a narrow screen the docked panes stack and the page scrolls; these are the heights they stack at. */
const STACKED_HEIGHT: Readonly<Record<PaneId, string>> = { SOURCES: 'minmax(360px, auto)', PREVIEW: '70vh', SIDE: '70vh', TIMELINE: '320px' };

/** The pane that takes what the others leave: the player, or the last docked pane when the player is not docked. */
const flexPaneOf = (row: readonly PaneId[]): PaneId | undefined => (row.includes('PREVIEW') ? 'PREVIEW' : row.at(-1));

/**
 * The studio's panes as the person has arranged them: docked ones in
 * resizable splits (footage, player and side panel across, the timeline
 * under them), popped ones in their own windows, closed ones nowhere until
 * Layout brings them back. Each divider is limited to sizes a pane can still
 * be worked in.
 */
export default function StudioWorkspace({ state, panes }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const { layout, revision } = state;
  const row = dockedRow(layout);
  const timelineDocked = layout.TIMELINE.mode === 'DOCKED';

  const frame = (id: PaneId) => (
    <Box data-tour={panes[id].tour} sx={{ height: '100%', minHeight: 0, minWidth: 0 }}>
      <PaneFrame id={id} title={panes[id].title} onPopOut={() => state.setMode(id, 'POPPED')} onClose={() => state.setMode(id, 'CLOSED')}>
        {panes[id].content}
      </PaneFrame>
    </Box>
  );

  const windows = PANE_ORDER.filter((id) => layout[id].mode === 'POPPED').map((id) => (
    <PaneWindow
      key={`${id}-${revision}`}
      pane={layout[id]}
      title={panes[id].title}
      onRect={state.setRect}
      onDock={() => state.setMode(id, 'DOCKED')}
      onClose={() => state.setMode(id, 'CLOSED')}
    >
      {panes[id].content}
    </PaneWindow>
  ));

  if (row.length === 0 && !timelineDocked) {
    return (
      <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 3, textAlign: 'center' }} data-testid="reel-layout-empty">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ai.reels.layout.allHidden')}
        </Typography>
        <DuncitButton size="small" variant="outlined" onClick={state.restore} disabled={state.restoring} data-testid="reel-layout-empty-restore">
          {t('ai.reels.layout.restore')}
        </DuncitButton>
        {windows}
      </Stack>
    );
  }

  if (!wide) {
    const stacked = [...row, ...(timelineDocked ? (['TIMELINE'] as const) : [])];
    return (
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateRows: stacked.map((id) => STACKED_HEIGHT[id]).join(' ') }} data-testid="reel-workspace-stacked">
        {stacked.map((id) => (
          <Box key={id} sx={{ minHeight: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
            {frame(id)}
          </Box>
        ))}
        {windows}
      </Box>
    );
  }

  const flexPane = flexPaneOf(row);
  let across: ReactNode = null;
  if (row.length === 1) across = frame(row[0]);
  if (row.length > 1) {
    across = (
      <SplitPane
        key={`row-${revision}-${row.join('-')}`}
        direction="horizontal"
        divider={SplitDivider}
        dividerSize={DIVIDER_SIZE}
        onResizeEnd={(sizes) => sizes.forEach((size, index) => state.setSize(row[index], size))}
      >
        {row.map((id) => (
          <Pane key={id} defaultSize={id === flexPane ? undefined : layout[id].size} minSize={PANE_LIMITS[id].min} maxSize={id === flexPane ? undefined : PANE_LIMITS[id].max}>
            {frame(id)}
          </Pane>
        ))}
      </SplitPane>
    );
  }

  let body: ReactNode = across ?? frame('TIMELINE');
  if (across && timelineDocked) {
    body = (
      <SplitPane
        key={`column-${revision}`}
        direction="vertical"
        divider={SplitDivider}
        dividerSize={DIVIDER_SIZE}
        onResizeEnd={(sizes) => state.setSize('TIMELINE', sizes[1] ?? layout.TIMELINE.size)}
      >
        <Pane minSize={PANE_LIMITS.PREVIEW.min}>{across}</Pane>
        <Pane defaultSize={layout.TIMELINE.size} minSize={PANE_LIMITS.TIMELINE.min} maxSize={PANE_LIMITS.TIMELINE.max}>
          {frame('TIMELINE')}
        </Pane>
      </SplitPane>
    );
  }

  // minWidth 0: as a flex item this box would otherwise be as wide as its
  // widest content — the timeline's whole length — so the split view measured
  // that width, gave it to the player and pushed the side pane off screen.
  return (
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex' }} data-testid="reel-workspace-split">
      {body}
      {windows}
    </Box>
  );
}
