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
import { IMPORT_REMOTE, PEXELS_SEARCH, UPLOAD_IMAGE, UPLOAD_SETTINGS } from '../src/queries';
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

/** Settings alone — the upload mutation has nothing behind it, so it rejects. */
const settingsOnly = (): MockedResponse[] => [
  {
    request: { query: UPLOAD_SETTINGS, variables: () => true },
    result: { data: { uploadSettings: SETTINGS } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const mocks = (): MockedResponse[] => [
  ...settingsOnly(),
  {
    request: { query: UPLOAD_IMAGE, variables: () => true },
    result: { data: { uploadImageToImagekit: { url: URL_A, fileId: 'ik-a', thumbnailUrl: null } } },
  },
  {
    request: { query: UPLOAD_IMAGE, variables: () => true },
    result: { data: { uploadImageToImagekit: { url: URL_B, fileId: 'ik-b', thumbnailUrl: null } } },
  },
];

const PEXELS_A = 'https://ik.imagekit.io/duncit/pods/pexels-a.jpg';
const PEXELS_B = 'https://ik.imagekit.io/duncit/pods/pexels-b.jpg';

const photo = (id: string) => ({
  id,
  photographer: 'Asha Rao',
  photographer_url: 'https://pexels.com/@asha',
  avg_color: '#334455',
  alt: `A badminton court ${id}`,
  src_large: `https://images.pexels.com/${id}-large.jpg`,
  src_medium: `https://images.pexels.com/${id}-medium.jpg`,
  src_tiny: `https://images.pexels.com/${id}-tiny.jpg`,
});

/** The device mocks plus a photos grid whose two cards import to two URLs. */
const withPexels = (): MockedResponse[] => [
  ...mocks(),
  {
    request: { query: PEXELS_SEARCH, variables: () => true },
    result: {
      data: { pexelsSearch: { page: 1, next_page: null, photos: [photo('p-1'), photo('p-2')] } },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: IMPORT_REMOTE, variables: () => true },
    result: { data: { importRemoteImageToImagekit: { url: PEXELS_A, fileId: 'ik-p1' } } },
  },
  {
    request: { query: IMPORT_REMOTE, variables: () => true },
    result: { data: { importRemoteImageToImagekit: { url: PEXELS_B, fileId: 'ik-p2' } } },
  },
];

const mount = (props: Partial<MediaPickerDialogProps> = {}, link = mocks()) => {
  const onClose = vi.fn();
  const onPicked = vi.fn();
  const result = render(
    <MemoryRouter>
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={link}>
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

/** The one action: it uploads whatever the device tab holds, then finishes. */
const clickUse = (name: string | RegExp = 'Use this image') =>
  fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('MediaPickerDialog upload flows', () => {
  it('uploads the device file, hands the ImageKit URL up and closes (single-pick)', async () => {
    const { onClose, onPicked } = mount();

    chooseFile(pngFile());
    await screen.findByText('court.png');
    clickUse();

    // Synchronous look at the in-flight state: the button says so, and the
    // exits are barred until the upload settles.
    expect(screen.getAllByText('Uploading…').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(URL_A));
    expect(onClose).toHaveBeenCalled();
  });

  it('uploads the device file and reports it through the tray (multi-pick)', async () => {
    const onPickedMany = vi.fn();
    const { onClose } = mount({ max: 4, onPickedMany });

    chooseFile(pngFile('a.png'));
    await screen.findByText('a.png');
    clickUse();

    // One press does both halves: the file reaches ImageKit and the tray hands
    // it back. There is nothing left for a second button to do.
    await waitFor(() => expect(onPickedMany).toHaveBeenCalledWith([URL_A]));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the dialog open when the upload it was asked to finish with fails', async () => {
    const onPickedMany = vi.fn();
    // No UPLOAD_IMAGE mock behind this one, so the mutation rejects.
    const { onClose } = mount({ max: 4, onPickedMany }, settingsOnly());

    chooseFile(pngFile('a.png'));
    await screen.findByText('a.png');
    clickUse();

    await screen.findByRole('alert');
    // Closing over the error would throw the file away and look like it worked.
    expect(onPickedMany).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('hands back a tray filled from Pexels, named by how much is in it', async () => {
    const onPickedMany = vi.fn();
    const { onClose } = mount({ max: 4, onPickedMany }, withPexels());

    fireEvent.click(screen.getByRole('tab', { name: 'Pexels photos' }));
    fireEvent.click(await screen.findByAltText('A badminton court p-1'));
    await screen.findByText('1 of 4');
    fireEvent.click(screen.getByAltText('A badminton court p-2'));
    await screen.findByText('2 of 4');

    // Nothing is waiting on the device tab, so the one action has only the tray
    // to hand back — and says how much of it there is.
    clickUse('Use these 2');
    expect(onPickedMany).toHaveBeenCalledWith([PEXELS_A, PEXELS_B]);
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
