/**
 * The caps a picker works in, resolved from Admin > Upload Settings.
 *
 * The point of the hook is that a call site never writes a limit of its own —
 * so what is worth asserting is that the admin's numbers reach the byte caps
 * AND the validate() the picker gates on, and that a surface with no settings
 * yet still refuses what the server would refuse rather than nothing at all.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UPLOAD_SETTINGS } from '../src/queries';
import { useUploadCaps } from '../src/useUploadCaps';
import { MB } from '../src/utils';

const IMAGES_AND_VIDEO = { allowImage: true, allowVideo: true, allowDocuments: false };

const file = (type: string, mb: number, name = 'pod-cover.jpg') =>
  ({ type, size: mb * MB, name }) as File;

const settings = {
  __typename: 'UploadSetting',
  id: 'us_mweb',
  surface: 'MWEB',
  max_image_mb: 4,
  max_video_mb: 25,
  allowed_image_formats: ['jpg', 'png'],
  allowed_video_formats: ['mp4'],
  image_compression_enabled: true,
  image_quality: 80,
  image_max_dimension: 1920,
  video_compression_enabled: false,
  video_crf: 28,
  video_max_height: 1080,
  ai_image_monitoring_enabled: true,
  default_crop_key: 'NO_CROP',
  crop_presets: [],
};

const mocks = [
  {
    request: { query: UPLOAD_SETTINGS, variables: { surface: 'MWEB' } },
    result: { data: { uploadSettings: settings } },
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
    {children}
  </MockedProvider>
);

describe('useUploadCaps', () => {
  it('turns the admin row into byte caps and one validate()', async () => {
    const { result } = renderHook(() => useUploadCaps('MWEB'), { wrapper });
    await waitFor(() => expect(result.current.maxImageMb).toBe(4));

    expect(result.current.maxImageBytes).toBe(4 * MB);
    expect(result.current.maxVideoBytes).toBe(25 * MB);
    expect(result.current.allowedImageFormats).toEqual(['jpg', 'png']);
    expect(result.current.validate(file('image/png', 3), IMAGES_AND_VIDEO)).toBeNull();
    expect(result.current.validate(file('image/png', 5), IMAGES_AND_VIDEO)).toMatch(/max 4 MB/);
    expect(result.current.validate(file('video/mp4', 30, 'reel.mp4'), IMAGES_AND_VIDEO)).toMatch(
      /max 25 MB/
    );
  });

  it('falls back to the package floor before the settings answer', () => {
    const { result } = renderHook(() => useUploadCaps('MWEB', { skip: true }), { wrapper });

    expect(result.current.maxImageBytes).toBe(15 * MB);
    expect(result.current.maxVideoBytes).toBe(100 * MB);
    expect(result.current.maxDocumentBytes).toBe(100 * MB);
    expect(result.current.maxImageMb).toBeUndefined();
    expect(result.current.validate(file('image/png', 16), IMAGES_AND_VIDEO)).toMatch(/max 15 MB/);
  });

  it('defaults to the portals surface when a caller names none', () => {
    const { result } = renderHook(() => useUploadCaps(undefined, { skip: true }), { wrapper });
    expect(result.current.maxImageBytes).toBe(15 * MB);
  });
});
