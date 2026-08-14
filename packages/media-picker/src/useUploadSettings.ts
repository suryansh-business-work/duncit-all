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
 *
 * `skip` matters more than it looks. The query needs a signed-in caller, and
 * the components that want these rules are dialogs that live mounted (closed)
 * for the whole session — so without it, every page load asks, and a
 * signed-out visitor's ask is refused and logged. Pass the same flag that
 * controls the dialog: nobody is choosing a crop preset behind a closed door.
 */
export function useUploadSettings(
  surface: UploadSurface = 'PORTALS',
  options?: { skip?: boolean }
): UploadSettings | null {
  const { data } = useQuery<UploadSettingsData>(UPLOAD_SETTINGS, {
    variables: { surface },
    fetchPolicy: 'cache-first',
    skip: options?.skip === true,
  });
  return data?.uploadSettings ?? null;
}
