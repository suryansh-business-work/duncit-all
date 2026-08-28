/**
 * The edges of the upload path — the fallbacks a happy upload never reaches.
 *
 * Each one exists because the browser can hand us less than the type says: a
 * file with no name, a store that answers with no reason, a picture whose
 * dimensions never resolve.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SingleImageUploadField from '../src/SingleImageUploadField';
import MediaListField from '../src/media-list-field/MediaListField';
import PexelsPhotoCard from '../src/PexelsPhotoCard';
import PexelsVideoCard from '../src/PexelsVideoCard';
import { useDeviceUpload } from '../src/useDeviceUpload';
import { directUploadToImagekit } from '../src/useImagekitDirectUpload';
import * as uploadModule from '../src/upload';
const { uploadImageToImagekit } = uploadModule;
import { UPLOAD_IMAGE, UPLOAD_SETTINGS } from '../src/queries';
// @ts-expect-error -- untyped deep path; the shape is react-router-dom's own
import { MemoryRouter } from '../../tabs/node_modules/react-router-dom';

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactElement, mocks: readonly MockedResponse[] = []) =>
  render(
    <MemoryRouter>
      <MockedProvider mocks={[...mocks]} addTypename={false}>
        <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
      </MockedProvider>
    </MemoryRouter>
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// -------------------------------------------------------------- upload.ts ----

describe('uploadImageToImagekit', () => {
  const client = () =>
    ({
      mutate: vi.fn().mockResolvedValue({
        data: { uploadImageToImagekit: { url: 'https://ik.imagekit.io/duncit/a.png' } },
      }),
    }) as never;

  beforeEach(() => {
    class Reader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,eA==';
        this.onload?.();
      }
    }
    vi.stubGlobal('FileReader', Reader);
  });

  it('sends the caller filename over the one on disk', async () => {
    const apollo = client();
    const file = new File(['x'], 'DSC_0001.png', { type: 'image/png' });

    await uploadImageToImagekit(apollo, file, { fileName: 'cover.png' });

    expect(apollo.mutate.mock.calls[0][0].variables).toMatchObject({ fileName: 'cover.png' });
  });

  it('falls back to the name on disk, and to the caller MIME type when the browser gave none', async () => {
    const apollo = client();
    const file = new File(['x'], 'DSC_0001.png', { type: '' });

    await uploadImageToImagekit(apollo, file, { fallbackMimeType: 'image/png' });

    expect(apollo.mutate.mock.calls[0][0].variables).toMatchObject({
      fileName: 'DSC_0001.png',
      mimeType: 'image/png',
    });
  });
});

// ------------------------------------------------- useImagekitDirectUpload ----

describe('directUploadToImagekit', () => {
  const AUTH = {
    uploadUrl: 'https://server.test/upload',
    ticket: 'tkt-1',
    urlEndpoint: 'https://ik.io/x',
  };

  let lastXhr: FakeXhr | null = null;

  class FakeXhr {
    url = '';
    status = 200;
    responseText = '';
    upload = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    open(_method: string, url: string) {
      this.url = url;
    }
    send() {
      lastXhr = this;
    }
  }

  const client = () => ({ mutate: vi.fn().mockResolvedValue({ data: { getImagekitAuth: AUTH } }) }) as never;

  beforeEach(() => {
    lastXhr = null;
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });

  // A clipboard paste or a canvas blob arrives with no name at all.
  it('invents a filename for a file that arrived without one', async () => {
    const file = new File(['x'], '', { type: 'video/mp4' });
    const promise = directUploadToImagekit(client(), file, 'pods');
    await vi.waitFor(() => expect(lastXhr).not.toBeNull());

    (lastXhr as FakeXhr).responseText = JSON.stringify({ url: 'https://ik.io/x/a.mp4' });
    (lastXhr as FakeXhr).onload?.();

    await expect(promise).resolves.toBe('https://ik.io/x/a.mp4');
    expect((lastXhr as FakeXhr).url).toContain('fileName=upload-');
  });

  it('reports the store reason for a refusal, and its own when there is none', async () => {
    const first = directUploadToImagekit(client(), new File(['x'], 'a.mp4'), 'pods');
    await vi.waitFor(() => expect(lastXhr).not.toBeNull());
    (lastXhr as FakeXhr).status = 413;
    (lastXhr as FakeXhr).responseText = JSON.stringify({ message: 'That clip is too long' });
    (lastXhr as FakeXhr).onload?.();
    await expect(first).rejects.toThrow('That clip is too long');

    lastXhr = null;
    const second = directUploadToImagekit(client(), new File(['x'], 'b.mp4'), 'pods');
    await vi.waitFor(() => expect(lastXhr).not.toBeNull());
    (lastXhr as FakeXhr).status = 500;
    (lastXhr as FakeXhr).responseText = '';
    (lastXhr as FakeXhr).onload?.();
    await expect(second).rejects.toThrow('Upload failed');
  });
});

// ------------------------------------------------------------ crop presets ----

describe('useDeviceUpload with a croppable preset', () => {
  const PRESET = {
    key: 'COVER',
    label: 'Cover',
    width: 1200,
    height: 630,
    enabled: true,
  };

  const settingsMock: MockedResponse = {
    request: { query: UPLOAD_SETTINGS },
    variableMatcher: () => true,
    result: {
      data: {
        uploadSettings: {
          surface: 'POD',
          crop_presets: [PRESET],
          default_crop_key: 'COVER',
        },
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  };

  it('sends the rect and the preset the reader cropped with', async () => {
    const upload = vi
      .spyOn(uploadModule, 'uploadImageToImagekit')
      .mockResolvedValue({ url: 'https://ik.imagekit.io/duncit/a.png' } as never);
    const { result } = renderHook(
      () =>
        useDeviceUpload({
          open: true,
          folder: 'pods',
          surface: 'POD',
          allowImage: true,
          allowVideo: false,
          allowDocuments: false,
          onPicked: vi.fn(),
          onClose: vi.fn(),
          clearAfterUpload: false,
          setError: vi.fn(),
        } as never),
      {
        wrapper: ({ children }) => (
          <MockedProvider mocks={[settingsMock]} addTypename={false}>
            <ThemeProvider theme={testTheme}>{children}</ThemeProvider>
          </MockedProvider>
        ),
      },
    );
    await settle();
    await settle();
    expect(result.current.cropKey).toBe('COVER');

    await act(async () => {
      result.current.onPickFile({
        target: { files: [new File(['x'], 'court.png', { type: 'image/png' })] },
      } as never);
    });
    act(() => {
      result.current.setCropRect({ x: 0, y: 0, width: 1200, height: 630 } as never);
    });
    await act(async () => {
      await result.current.uploadFromDevice();
    });

    expect(upload.mock.calls[0][2]).toMatchObject({
      cropPreset: 'COVER',
      crop: { x: 0, y: 0, width: 1200, height: 630 },
    });
  });
});

// --------------------------------------------------------------- chromes ----

describe('single-image chromes while busy or disabled', () => {
  it('locks every avatar control while the field is disabled', async () => {
    wrap(
      <SingleImageUploadField
        value="https://ik.imagekit.io/duncit/a.png"
        onChange={vi.fn()}
        folder="/pods"
        variant="avatar"
        label="Cover"
        disabled
      />,
    );
    await settle();

    expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled();
    expect(screen.getByLabelText('Remove image')).toBeDisabled();
  });

  it('shows the adornment chrome working while an upload is in flight', async () => {
    class SlowReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,eA==';
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal('FileReader', SlowReader);
    const uploadMock: MockedResponse = {
      request: { query: UPLOAD_IMAGE },
      variableMatcher: () => true,
      delay: 50,
      result: {
        data: { uploadImageToImagekit: { url: 'https://ik.imagekit.io/duncit/a.png', fileId: 'f-1' } },
      },
    };
    const { container } = wrap(
      <SingleImageUploadField value="" onChange={vi.fn()} folder="/pods" />,
      [uploadMock],
    );
    await settle();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['x'], 'a.png', { type: 'image/png' })],
    });
    fireEvent.change(input);

    await waitFor(() => expect(container.querySelector('[role="progressbar"]')).not.toBeNull());
  });
});

// ------------------------------------------------------- Pexels fallbacks ----

describe('Pexels card source fallbacks', () => {
  const photo = {
    id: 'p-1',
    photographer: 'Asha Rao',
    photographer_url: 'https://pexels.com/@asha',
    avg_color: '#334455',
    alt: 'A badminton court',
    src_large: '',
    src_medium: 'https://images.pexels.com/p-1-medium.jpg',
    src_tiny: 'https://images.pexels.com/p-1-tiny.jpg',
  };

  it('falls back to the medium source for a photo Pexels listed without a large one', () => {
    const onPick = vi.fn();
    wrap(
      <PexelsPhotoCard photo={photo} picked={false} importing={false} anyImporting={false} onPick={onPick} />,
    );

    fireEvent.click(screen.getByRole('listitem'));

    expect(onPick).toHaveBeenCalledWith(photo);
  });

  it('falls back to the still for a clip Pexels listed without a preview', () => {
    const { container } = wrap(
      <PexelsVideoCard
        video={{
          id: 'v-1',
          width: 1920,
          height: 1080,
          duration: 18,
          preview: '',
          image: 'https://images.pexels.com/v-1-still.jpg',
          user_name: 'Vikram N',
          video_files: [],
        }}
        importing={false}
        anyImporting={false}
        onPick={vi.fn()}
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://images.pexels.com/v-1-still.jpg',
    );
  });
});

// ------------------------------------------------------- list field picks ----

describe('MediaListField picking through the dialog', () => {
  const UPLOADED = 'https://ik.imagekit.io/duncit/pods/picked.jpg';
  const A = 'https://ik.imagekit.io/duncit/pods/a.jpg';
  const B = 'https://ik.imagekit.io/duncit/pods/b.jpg';

  /** Drives the dialog's device tab to the point where it reports a URL. */
  const uploadThroughDialog = async () => {
    const input = document.body.querySelector(
      '[role="dialog"] input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['x'], 'court.png', { type: 'image/png' })],
    });
    fireEvent.change(input);
    await settle();

    const upload = [...document.body.querySelectorAll<HTMLElement>('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Upload',
    );
    fireEvent.click(upload as HTMLElement);
    await settle();
    await settle();
  };

  beforeEach(() => {
    vi.spyOn(uploadModule, 'uploadImageToImagekit').mockResolvedValue({ url: UPLOADED } as never);
  });

  it('appends what was picked to the end of the list', async () => {
    const onChange = vi.fn();
    wrap(
      <MediaListField label="Gallery" value={A} onChange={onChange} folder="/pods" deviceOnly />,
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: /Add image/ }));
    await settle();
    await uploadThroughDialog();

    expect(onChange).toHaveBeenCalledWith([A, UPLOADED].join('\n'));
  });

  it('replaces the row it was opened on, leaving the others alone', async () => {
    const onChange = vi.fn();
    const { container } = wrap(
      <MediaListField
        label="Gallery"
        value={[A, B].join('\n')}
        onChange={onChange}
        folder="/pods"
        deviceOnly
      />,
    );
    await settle();

    let node = container.querySelectorAll('img, video')[1]?.parentElement ?? null;
    while (node && node.querySelectorAll('button').length < 4) node = node.parentElement;
    fireEvent.click(node?.querySelectorAll('button')[0] as HTMLElement);
    await settle();
    await uploadThroughDialog();

    expect(onChange).toHaveBeenCalledWith([A, UPLOADED].join('\n'));
  });
});
