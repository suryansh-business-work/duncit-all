/**
 * The picker actually finishing a pick.
 *
 * The dialog's own suite mounts it with nothing behind it; this one puts a real
 * (mocked) `uploadImageToImagekit` answer behind the device tab and walks the
 * two shapes end to end: single-pick hands the URL up and closes, multi-pick
 * collects into the tray, relabels the finish button, and only closes when the
 * reader says done. The refusal path matters too — a file the policy rules out
 * must surface as a dismissible error, not a dead Upload button.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
// Deep import through @duncit/tabs' own node_modules on purpose: this package
// only PEER-depends on react-router, and pnpm's auto-installed peer here
// (6.30.3) is a DIFFERENT instance than the one tabs resolves (6.30.6) — a
// Router from the wrong instance is invisible to useTabParam's useSearchParams.
// @ts-expect-error -- untyped deep path; the shape is react-router's own
import { MemoryRouter } from '../../tabs/node_modules/react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import MediaPickerDialog from '../src/MediaPickerDialog';
import { UPLOAD_IMAGE, UPLOAD_SETTINGS } from '../src/queries';
import type { MediaPickerDialogProps, UploadSettings } from '../src/types';

const testTheme = createTheme();

beforeAll(() => {
  globalThis.URL.createObjectURL ??= () => 'blob:preview';
  globalThis.URL.revokeObjectURL ??= () => undefined;
});

const SETTINGS: UploadSettings = {
  id: 'us-1',
  surface: 'PORTALS',
  max_image_mb: 15,
  max_video_mb: 100,
  allowed_image_formats: [],
  allowed_video_formats: [],
  image_compression_enabled: true,
  image_quality: 80,
  image_max_dimension: 2000,
  video_compression_enabled: true,
  video_crf: 28,
  video_max_height: 1080,
  ai_image_monitoring_enabled: false,
  default_crop_key: 'NO_CROP',
  crop_presets: [{ key: 'NO_CROP', label: 'No crop', width: 0, height: 0, enabled: true }],
};

const URL_A = 'https://ik.imagekit.io/duncit/pods/pick-a.jpg';
const URL_B = 'https://ik.imagekit.io/duncit/pods/pick-b.jpg';

const mocks = (): MockedResponse[] => [
  {
    request: { query: UPLOAD_SETTINGS, variables: () => true },
    result: { data: { uploadSettings: SETTINGS } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: UPLOAD_IMAGE, variables: () => true },
    result: { data: { uploadImageToImagekit: { url: URL_A, fileId: 'ik-a', thumbnailUrl: null } } },
  },
  {
    request: { query: UPLOAD_IMAGE, variables: () => true },
    result: { data: { uploadImageToImagekit: { url: URL_B, fileId: 'ik-b', thumbnailUrl: null } } },
  },
];

const mount = (props: Partial<MediaPickerDialogProps> = {}) => {
  const onClose = vi.fn();
  const onPicked = vi.fn();
  const result = render(
    <MemoryRouter>
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks()}>
        <ThemeProvider theme={testTheme}>
          <MediaPickerDialog open onClose={onClose} onPicked={onPicked} folder="/pods" {...props} />
        </ThemeProvider>
      </MockedProvider>
    </MemoryRouter>
  );
  return { ...result, onClose, onPicked };
};

const pngFile = (name = 'court.png') =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

const chooseFile = (file: File) => {
  const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
};

const clickUpload = () => fireEvent.click(screen.getByRole('button', { name: /Upload to ImageKit/ }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('MediaPickerDialog upload flows', () => {
  it('uploads the device file, hands the ImageKit URL up and closes (single-pick)', async () => {
    const { onClose, onPicked } = mount();

    chooseFile(pngFile());
    await screen.findByText('court.png');
    clickUpload();

    // Synchronous look at the in-flight state: the button says so, and the
    // exits are barred until the upload settles.
    expect(screen.getAllByText('Uploading…').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(URL_A));
    expect(onClose).toHaveBeenCalled();
  });

  it('collects picks in the tray, relabels the finish button, and closes only on done (multi-pick)', async () => {
    const onPickedMany = vi.fn();
    const { onClose } = mount({ max: 4, onPickedMany });

    chooseFile(pngFile('a.png'));
    await screen.findByText('a.png');
    clickUpload();
    await screen.findByText('1 of 4');

    // The first pick did NOT close the dialog, and one pick reads singular.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Use this image' })).toBeEnabled();

    chooseFile(pngFile('b.png'));
    await screen.findByText('b.png');
    clickUpload();
    await screen.findByText('2 of 4');

    fireEvent.click(screen.getByRole('button', { name: 'Use these 2' }));
    expect(onPickedMany).toHaveBeenCalledWith([URL_A, URL_B]);
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a file the accept policy rules out, and the error can be dismissed', async () => {
    mount(); // default accept: images and videos, no documents
    chooseFile(new File(['x'], 'contract.pdf', { type: 'application/pdf' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Please choose an image or video file');

    fireEvent.click(screen.getByTitle('Close'));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('offers only the device tab when the caller says deviceOnly', async () => {
    mount({ deviceOnly: true });

    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(1));
  });
});
