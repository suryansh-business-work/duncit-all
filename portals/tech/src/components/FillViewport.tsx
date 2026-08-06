import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  children: ReactNode;
  /** Breathing room below the page, in pixels. */
  gutter?: number;
}

/**
 * A page that ends where the viewport ends, so the panes inside it scroll and
 * the window does not.
 *
 * The shell's `<main>` grows with its content, so `height: 100%` on a page
 * resolves against an auto-height parent and bounds nothing — which is why
 * these editors made the whole window scroll. The height is MEASURED from this
 * element's own top rather than written as `calc(100dvh - 152px)`: the shell's
 * app bar and padding are responsive, and a magic number would be wrong at the
 * first breakpoint and silently wrong forever after.
 */
export default function FillViewport({ children, gutter = 24 }: Readonly<Props>) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const top = element.getBoundingClientRect().top;
      // A floor keeps the panes usable on a short window instead of collapsing
      // them to nothing; the page scrolls in that case, which is the right
      // trade at 400px tall.
      setHeight(Math.max(globalThis.innerHeight - top - gutter, 360));
    };

    measure();
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, [gutter]);

  // The shell's sidebar can collapse after mount, moving this element. One
  // observer catches every such reflow without polling.
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const top = element.getBoundingClientRect().top;
      setHeight(Math.max(globalThis.innerHeight - top - gutter, 360));
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [gutter]);

  return (
    <Box
      ref={ref}
      sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: height ?? '70vh' }}
    >
      {children}
    </Box>
  );
}
