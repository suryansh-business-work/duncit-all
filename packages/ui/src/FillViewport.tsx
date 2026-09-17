import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

export interface FillViewportProps {
  children: ReactNode;
  /** Breathing room below the page, in pixels. */
  gutter?: number;
}

/** The shortest the panes may get before the page scrolls instead. */
const MIN_HEIGHT = 360;

/**
 * A page that ends where the viewport ends, so the panes inside it scroll and
 * the window does not.
 *
 * The shell's `<main>` grows with its content, so `height: 100%` on a page
 * resolves against an auto-height parent and bounds nothing. The height is
 * MEASURED from this element's own top rather than written as
 * `calc(100dvh - 152px)`: the shell's app bar and padding are responsive, and a
 * magic number would be wrong at the first breakpoint.
 */
export function FillViewport({ children, gutter = 24 }: Readonly<FillViewportProps>) {
  // A callback ref, so the effect re-runs once the element exists.
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!element) return;

    // A floor keeps the panes usable on a short window instead of collapsing
    // them to nothing; the page scrolls in that case.
    const measure = () => {
      const top = element.getBoundingClientRect().top;
      setHeight(Math.max(globalThis.innerHeight - top - gutter, MIN_HEIGHT));
    };

    measure();
    globalThis.addEventListener('resize', measure);
    // The shell's sidebar can collapse after mount, moving this element. One
    // observer catches every such reflow without polling.
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(document.body);
    return () => {
      globalThis.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [element, gutter]);

  return (
    <Box
      ref={setElement}
      sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: height ?? '70vh' }}
    >
      {children}
    </Box>
  );
}
