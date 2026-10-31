import { Img } from 'remotion';
import type { ReelAsset, ReelBrand } from '../types';
import { CORNER } from './corners';

interface Props {
  brand: ReelBrand;
  /** The watermark picture, found by the composition; nothing is drawn without it. */
  asset: ReelAsset | undefined;
}

/**
 * The brand's mark, over the whole reel rather than one scene: it is on every
 * frame a transition draws, which an overlay inside a scene is not.
 *
 * `crossOrigin` for the same reason as every other picture in the composition —
 * the exporter reads the canvas back, and a picture fetched without CORS taints it.
 */
export function WatermarkLayer({ brand, asset }: Readonly<Props>) {
  if (!asset || brand.watermark_asset_id === '') return null;
  return (
    <Img
      src={asset.url}
      crossOrigin="anonymous"
      alt=""
      style={{ position: 'absolute', width: `${brand.watermark_width_pct}%`, ...CORNER[brand.watermark_corner] }}
    />
  );
}
