import { useQuery } from '@apollo/client';
import { UPLOAD_SETTINGS } from './queries';
import type { UploadSettings, UploadSurface } from './types';

interface UploadSettingsData {
  uploadSettings?: UploadSettings | null;
}

/**
 * Admin-managed upload rules for a surface (sizes, formats, crop presets).
 * Returns null while loading / on failure — callers fall back to the static
 * package limits so uploads keep working if settings cannot be read.
 */
export function useUploadSettings(surface: UploadSurface = 'PORTALS'): UploadSettings | null {
  const { data } = useQuery<UploadSettingsData>(UPLOAD_SETTINGS, {
    variables: { surface },
    fetchPolicy: 'cache-first',
  });
  return data?.uploadSettings ?? null;
}
