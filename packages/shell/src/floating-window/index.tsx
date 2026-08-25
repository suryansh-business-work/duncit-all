import { useState } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { tokens } from '@duncit/theme';
import { useTranslation } from '../i18n/useTranslation';
import { useWorkspaceWindow, type WindowIcon } from '../workspace';
import { ResizeGrip, TitleBar } from './WindowChrome';
import { useWindowDrag, type WindowRect } from './useWindowDrag';

export interface FloatingWindowProps {
  /** Stable id — this is how the taskbar knows it is the same window. */
  id: string;
  open: boolean;
  title: string;
  subtitle?: string;
  /** Which icon the taskbar draws for it. */
  icon?: WindowIcon;
  /** Where it appears the first time. Clamped to the viewport. */
  initial: WindowRect;
  /** Shown before closing. Absent means close without asking. */
  closeWarning?: { title: string; message: string; confirmLabel: string };
  /**
   * The content manages its own height instead of scrolling.
   *
   * For a call: the controls belong on a fixed floor with the picture taking
   * whatever is left, and a scrolling body would let the hang-up button drift
   * off the bottom the moment somebody turned their camera on.
   */
  fill?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * A window that floats over the page instead of covering it.
 *
 * Deliberately NOT a Dialog: a modal takes the whole screen hostage behind a
 * backdrop, and the entire point of a call window is that you keep working in
 * the page underneath it while you talk. So it is a plain positioned Paper —
 * draggable by its bar, resizable from its corner, and minimisable when it is
 * in the way of the thing being discussed.
 *
 * Minimising sends it to the console's TASKBAR, which is where a running thing
 * belongs: it leaves the page entirely and comes back from the button along the
 * bottom. Rendered outside the shell — a test, a storybook — there is no
 * taskbar to go to, so it falls back to rolling up to its own title bar, which
 * is what it did before there was one.
 *
 * Closing asks first when the caller says it should, because the close button
 * on a call window ends the call, and that is not an action to hand somebody on
 * a mis-click.
 */
export default function FloatingWindow({
  id,
  open,
  title,
  subtitle,
  icon = 'WINDOW',
  initial,
  closeWarning,
  fill,
  onClose,
  children,
}: Readonly<FloatingWindowProps>) {
  const { t } = useTranslation();
  const { rect, begin, move, end } = useWindowDrag(initial);
  const taskbar = useWorkspaceWindow(open ? { id, title, subtitle, icon } : null);
  const [maximised, setMaximised] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const askToClose = () => {
    if (closeWarning) {
      setConfirming(true);
      return;
    }
    onClose();
  };

  /** Away on the taskbar; the button down there is the whole of it now. */
  const onTaskbar = taskbar.minimised && taskbar.docked;
  /** No taskbar to go to — rolled up to its own bar, where it started. */
  const rolledUp = taskbar.minimised && !taskbar.docked;

  /*
    Minimised wins over maximised.

    Otherwise minimising a full-screen window leaves the whole screen covered
    by one line of text, which is the opposite of what the button says.
  */
  const spread = maximised
    ? {
        left: 0,
        top: 0,
        width: '100vw',
        // Down to the taskbar, not to the bottom of the screen: a maximised
        // window that covered the bar would hide its own way back.
        height: `calc(100dvh - ${tokens.size.taskbarHeight}px)`,
      }
    : { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
  const box = rolledUp ? { ...spread, height: 'auto' } : spread;

  return (
    <>
      {open && !onTaskbar && (
        <Paper
          elevation={8}
          role="dialog"
          aria-label={title}
          sx={{
            position: 'fixed',
            ...box,
            // Above the app's own chrome, below MUI's modals: a confirm opened
            // from in here has to land on top of it.
            zIndex: (theme) => theme.zIndex.drawer + 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: maximised ? 0 : 2,
          }}
        >
          <TitleBar
            title={title}
            subtitle={subtitle}
            maximised={maximised}
            onMinimise={taskbar.minimise}
            onToggleMaximise={() => setMaximised((value) => !value)}
            onClose={askToClose}
            onPointerDown={maximised ? () => undefined : begin('MOVE')}
            onPointerMove={move}
            onPointerUp={end}
          />

          {rolledUp ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', px: 1.5, py: 1 }}>
              {t('shell.chat.window.minimised')}
            </Typography>
          ) : (
            <Stack
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: fill ? 'hidden' : 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              {children}
            </Stack>
          )}

          {/* Anchored to the Paper, which is already positioned. It used to sit
              in a wrapper of its own height — zero — so the grip floated above
              the corner it was meant to be. */}
          {!maximised && !rolledUp && (
            <ResizeGrip onPointerDown={begin('RESIZE')} onPointerMove={move} onPointerUp={end} />
          )}
        </Paper>
      )}

      {closeWarning && (
        <ConfirmDialog
          open={confirming}
          title={closeWarning.title}
          message={closeWarning.message}
          confirmLabel={closeWarning.confirmLabel}
          confirmColor="error"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

export { type WindowRect } from './useWindowDrag';
