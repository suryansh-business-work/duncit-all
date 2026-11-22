import { formatBytes } from '@duncit/media-picker';

interface ImageMetaInput {
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
}

/** "PNG · 512×512 · 24 KB" — whichever of the three are known. */
export function imageMeta(item: ImageMetaInput): string {
  const type = item.mime_type ? item.mime_type.replace('image/', '').replace('+xml', '').toUpperCase() : '';
  const size = item.width && item.height ? `${item.width}×${item.height}` : '';
  const bytes = item.size_bytes ? formatBytes(item.size_bytes) : '';
  return [type, size, bytes].filter(Boolean).join(' · ');
}
