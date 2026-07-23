import { useEffect, useState } from 'react';
import { logs } from '@duncit/logs';

import { UploadSettingsDocument } from '@/graphql/status';
import { UploadSurface } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

export interface UploadCropPreset {
  key: string;
  label: string;
  width: number;
  height: number;
  enabled: boolean;
}

export interface MobileUploadSettings {
  max_image_mb: number;
  max_video_mb: number;
  allowed_image_formats: string[];
  allowed_video_formats: string[];
  default_crop_key: string;
  crop_presets: UploadCropPreset[];
}

/**
 * Admin Upload Settings for the native app (always the MOBILE surface): crop
 * presets, size caps and allowed formats. Settings are an enhancement — a fetch
 * failure resolves to `null` and callers fall back to a plain upload (no crop
 * presets), so a settings outage never blocks an upload.
 */
export function useUploadSettings(): MobileUploadSettings | null {
  const [settings, setSettings] = useState<MobileUploadSettings | null>(null);

  useEffect(() => {
    let active = true;
    graphqlRequest(UploadSettingsDocument, { surface: UploadSurface.Mobile }, { auth: true })
      .then((res) => {
        if (active) setSettings(res.uploadSettings);
      })
      .catch((error) => {
        // Silent for the user (settings are an enhancement) but logged in dev so
        // a missing crop-preset list is easy to diagnose — most often the API the
        // app points at hasn't got the MOBILE Upload-Surface yet.
        if (__DEV__) {
          logs.mobileApp.warn('useUploadSettings', 'fetch', {
            msg: 'Upload settings fetch failed — crop presets unavailable',
            error,
          });
        }
        if (active) setSettings(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
