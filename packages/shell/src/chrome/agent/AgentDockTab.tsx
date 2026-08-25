import { Box, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useTranslation } from '../../i18n/useTranslation';
import { useWorkspace } from '../../workspace';
import { DOCK_TAB_HEIGHT, useEdgeDock } from './useEdgeDock';

interface Props {
  onOpen: () => void;
}

/**
 * The way into the Agent, from every console.
 *
 * A rectangular tab stuck to the edge of the viewport rather than a round
 * button floating over the bottom-right corner. The corner is where a page's
 * own actions live — a save bar, a table's pagination, the last row of a long
 * form — and a circle parked on top of them is in the way on exactly the pages
 * people spend longest on. Against the edge it covers a 34px strip of margin
 * and nothing else.
 *
 * It is DRAGGABLE because "out of the way" is not the same place on every
 * screen: drag it up or down its edge, or across the middle of the screen to
 * stick it to the other one. Where it ends up is kept per person and follows
 * them into every console (see useWorkspaceState).
 */
export function AgentDockTab({ onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const saved = workspace?.agent ?? { edge: 'RIGHT' as const, offset: 0.5 };
  const { dock, top, dragging, handlers } = useEdgeDock(saved, (next) => workspace?.moveAgent(next));

  const right = dock.edge === 'RIGHT';

  return (
    <Tooltip title={t('shell.agent.dockHint')} placement={right ? 'left' : 'right'}>
      <Box
        component="button"
        type="button"
        onClick={onOpen}
        aria-label={t('shell.agent.open')}
        {...handlers}
        sx={{
          position: 'fixed',
          top,
          [right ? 'right' : 'left']: 0,
          width: 34,
          height: DOCK_TAB_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          border: 0,
          p: 0,
          color: 'primary.contrastText',
          bgcolor: 'primary.main',
          // Square against the edge it is stuck to, rounded on the side that
          // faces the page — the shape of a tab, not of a floating button.
          borderRadius: right ? '10px 0 0 10px' : '0 10px 10px 0',
          boxShadow: 3,
          cursor: dragging ? 'grabbing' : 'pointer',
          // Or the drag selects the label instead of moving the tab.
          userSelect: 'none',
          touchAction: 'none',
          transition: dragging ? 'none' : 'top 120ms ease, background-color 120ms ease',
          // Above the app's own chrome, below MUI's modals — the same band the
          // floating call window sits in.
          zIndex: (theme) => theme.zIndex.drawer + 1,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: 14, opacity: 0.65 }} />
        <AutoAwesomeIcon sx={{ fontSize: 18 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.6,
            fontSize: 11,
            // Reading up the tab, so the label fits a 34px strip without
            // becoming three stacked letters.
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {t('shell.agent.title')}
        </Typography>
      </Box>
    </Tooltip>
  );
}
