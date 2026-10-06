import type { DashboardWidget } from '@duncit/dashboard';
import { PublishPageCard, type PublishPageCardProps } from '@duncit/public-page';

/**
 * The "Publish your page" card as a dashboard widget — one definition for the
 * venue and host dashboards, so both size and place it the same way.
 * `y` is the row it starts on when the owner has no saved layout.
 */
export function publicPageWidget(card: PublishPageCardProps, y: number): DashboardWidget {
  return {
    id: 'public-page',
    bare: true,
    // The card grows once published (link, QR, tracking) — measure, never fix.
    fitContent: true,
    defaultLayout: { x: 0, y, w: 12, h: 4 },
    minW: 4,
    minH: 2,
    content: <PublishPageCard {...card} />,
  };
}
