import type { ReactNode } from 'react';
import { ScrollRail } from '@duncit/ui';

interface Props {
  children: ReactNode;
  /** Space between the entries, in theme units (1.5 = 12px cards, 1 = 8px chips). */
  gap?: number;
  /** Optional root test id — each caller names its own rail. */
  testId?: string;
}

/**
 * One sideways-scrolling Home rail: it bleeds out of the page's 16px gutter to
 * the screen edges and insets its entries by the same 16px, so the first card
 * lines up with the section title and the last one is visibly cut off — the
 * only honest "this scrolls" signal with no scrollbar. Left/right arrow
 * buttons (from `@duncit/ui`'s `ScrollRail`) layer over the edges for
 * mouse/trackpad users; touch keeps swiping as before. Native twin: each
 * rail's `ScrollRail` in app/mobile-app/src/components/ScrollRail.
 */
export default function HomeRail({ children, gap = 1.5, testId }: Readonly<Props>) {
  return (
    <ScrollRail gap={gap} testId={testId} bleed>
      {children}
    </ScrollRail>
  );
}
