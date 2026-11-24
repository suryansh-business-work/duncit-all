import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { FloatingWindow, type WindowRect } from '@duncit/shell';
import { defineDemo } from '../../types';

export interface FloatingWindowMock {
  /** What the window is called on its bar and on the taskbar. */
  title: string;
  /** Where it opens the first time. */
  initial: WindowRect;
}

export const FLOATING_WINDOW_MOCK: FloatingWindowMock = {
  title: 'Footage — Reel Studio',
  initial: { x: 120, y: 120, width: 420, height: 320 },
};

/** A pane popped out of a page: drag it by its bar, resize it from its corner, and watch where it was left. */
export function FloatingWindowDemo({ title, initial }: Readonly<FloatingWindowMock>) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState<WindowRect | null>(null);

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Button variant="contained" onClick={() => setOpen(true)} disabled={open}>
        Pop out
      </Button>
      <Typography variant="body2">{left ? `Left at ${left.x}, ${left.y} — ${left.width} × ${left.height}` : 'Not moved yet'}</Typography>
      <FloatingWindow id="docs-floating-window" open={open} title={title} initial={initial} onRectChange={setLeft} onClose={() => setOpen(false)}>
        <Typography variant="body2" sx={{ p: 2 }}>
          The pane&apos;s content. Close the window to put it away.
        </Typography>
      </FloatingWindow>
    </Stack>
  );
}

export const floatingWindowDemo = defineDemo<FloatingWindowMock>({
  id: 'floating-window',
  title: 'A window that floats over the page and says where it was left',
  note: 'FloatingWindow — what calls and Reel Studio\'s popped-out panes use. onRectChange fires once when a drag or a resize ends, so a page can save the place with its layout.',
  mock: FLOATING_WINDOW_MOCK,
  render: (mock) => <FloatingWindowDemo {...mock} />,
});
