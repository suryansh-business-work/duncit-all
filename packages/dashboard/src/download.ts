import { downloadBlob } from '@duncit/utils';

const SKIP_ATTRIBUTE = 'data-dashboard-skip';

/**
 * Spread onto chrome that belongs on screen but not in the downloaded picture —
 * the toolbar (Download included) and inline errors.
 */
export const SKIP_IN_DOWNLOAD = { [SKIP_ATTRIBUTE]: '' };

/** iOS Safari refuses to draw a canvas past this many pixels, so the image would never be made. */
const MAX_CANVAS_PIXELS = 16_777_216;

/**
 * Pixel density of the image: retina-sharp 2x where the canvas can take it,
 * less for a dashboard so tall that 2x would pass the canvas limit.
 */
export function imageScale(width: number, height: number): number {
  return Math.min(2, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height)));
}

/** Whether a node belongs in the picture — everything except chrome marked `SKIP_IN_DOWNLOAD`. */
export function inDownload(node: Node): boolean {
  return !(node instanceof Element && node.hasAttribute(SKIP_ATTRIBUTE));
}

/**
 * Saves `node` — the dashboard exactly as it is arranged on screen — as a PNG.
 *
 * The rasteriser is imported on demand, so it loads the first time someone
 * downloads rather than with every dashboard page.
 */
export async function downloadDashboardImage(
  node: HTMLElement,
  fileName: string,
  backgroundColor: string
): Promise<void> {
  const { domToBlob } = await import('modern-screenshot');
  const blob = await domToBlob(node, {
    backgroundColor,
    scale: imageScale(node.scrollWidth, node.scrollHeight),
    filter: inDownload,
  });
  downloadBlob(blob, fileName);
}
