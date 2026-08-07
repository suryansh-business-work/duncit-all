import { useState } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { ResizeGrip, TitleBar } from './WindowChrome';
import { useWindowDrag, type WindowRect } from './useWindowDrag';

export interface FloatingWindowProps {
  open: boolean;
  title: string;
  subtitle?: string;
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
 * draggable by its bar, resizable from its corner, and minimisable to a strip
 * when it is in the way of the thing being discussed.
 *
 * Closing asks first when the caller says it should, because the close button
 * on a call window ends the call, and that is not an action to hand somebody on
 * a mis-click.
 */
export default function FloatingWindow({
  open,
  title,
  subtitle,
  initial,
  closeWarning,
  fill,
  onClose,
  children,
}: Readonly<FloatingWindowProps>) {
  const { rect, begin, move, end } = useWindowDrag(initial);
  const [minimised, setMinimised] = useState(false);
  const [maximised, setMaximised] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!open) return null;

  const askToClose = () => {
    if (closeWarning) {
      setConfirming(true);
      return;
    }
    onClose();
  };

  /*
    Minimised wins over maximised.

    Otherwise minimising a full-screen window leaves the whole screen covered
    by one line of text, which is the opposite of what the button says. Rolled
    up to its bar in its own corner is what minimise means here — there is no
    taskbar to go to.
  */
  const spread = maximised
    ? { left: 0, top: 0, width: '100vw', height: '100dvh' }
    : { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
  const box = minimised ? { ...spread, height: 'auto' } : spread;

  return (
    <>
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
          onMinimise={() => setMinimised((value) => !value)}
          onToggleMaximise={() => setMaximised((value) => !value)}
          onClose={askToClose}
          onPointerDown={maximised ? () => undefined : begin('MOVE')}
          onPointerMove={move}
          onPointerUp={end}
        />

        {minimised ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, py: 1 }}>
            Still running — this window is minimised.
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
        {!maximised && !minimised && (
          <ResizeGrip onPointerDown={begin('RESIZE')} onPointerMove={move} onPointerUp={end} />
        )}
      </Paper>

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
