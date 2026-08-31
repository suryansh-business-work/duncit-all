/**
 * The single-image field, all three chromes.
 *
 * Everything goes through the pick → size-gate → ImageKit → onChange(url) state
 * machine, so what is worth pinning down is the gate (an over-size file never
 * leaves the device), the failure (the server's own sentence, dismissible) and
 * the fact that the field is CONTROLLED — it reports upward and never keeps its
 * own copy of the URL.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SingleImageUploadField from '../src/SingleImageUploadField';
import { UPLOAD_IMAGE } from '../src/queries';
import type { SingleImageVariant } from '../src/single-image/types';

const IMG = 'https://ik.imagekit.io/duncit/pod/cover.jpg';
const UPLOADED = 'https://ik.imagekit.io/duncit/pods/new-cover.jpg';

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

/** A file whose bytes are read through a stubbed FileReader (see below). */
const pngFile = (name = 'cover.png', size = 1024) => {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/** jsdom's FileReader never fires without a real blob, so the data URL is stubbed. */
const stubFileReader = () => {
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
};

const uploadMock = (over: Partial<MockedResponse> = {}): MockedResponse =>
  ({
    request: { query: UPLOAD_IMAGE, variables: () => true },
    result: {
      data: {
        uploadImageToImagekit: {
          __typename: 'ImagekitUpload',
          url: UPLOADED,
          fileId: 'file-1',
          thumbnailUrl: UPLOADED,
        },
      },
    },
    ...over,
  }) as MockedResponse;

const wrap = (ui: React.ReactElement, mocks: readonly MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

/** The hidden <input type="file"> the three chromes all render. */
const fileInput = () => document.body.querySelector('input[type="file"]') as HTMLInputElement;

const pick = async (file: File | null) => {
  const input = fileInput();
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: file ? [file] : [],
  });
  fireEvent.change(input);
  await settle();
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('SingleImageUploadField uploading', () => {
  it('uploads the picked file and reports the stored URL upward', async () => {
    stubFileReader();
    const onChange = vi.fn();
    wrap(
      <SingleImageUploadField value="" onChange={onChange} folder="/pods" variant="url-button" />,
      [uploadMock()],
    );
    await settle();

    await pick(pngFile());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(UPLOADED));
  });

  // A cleared picker must not re-upload whatever was chosen last.
  it('does nothing at all when the picker was dismissed with no file', async () => {
    const onChange = vi.fn();
    wrap(<SingleImageUploadField value="" onChange={onChange} folder="/pods" variant="url-button" />);
    await settle();

    await pick(null);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses an over-size file before it leaves the device', async () => {
    const onChange = vi.fn();
    wrap(
      <SingleImageUploadField
        value=""
        onChange={onChange}
        folder="/pods"
        variant="url-button"
        maxBytes={2 * 1024 * 1024}
      />,
    );
    await settle();

    await pick(pngFile('huge.png', 5 * 1024 * 1024));

    expect(screen.getByText('huge.png is too large (max 2 MB)')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the caller wording for an over-size file when there is one', async () => {
    wrap(
      <SingleImageUploadField
        value=""
        onChange={vi.fn()}
        folder="/pods"
        variant="url-button"
        maxBytes={1024}
        oversizeMessage={(file) => `${file.name} will not fit on a receipt`}
      />,
    );
    await settle();

    await pick(pngFile('huge.png', 4096));

    expect(screen.getByText('huge.png will not fit on a receipt')).toBeInTheDocument();
  });

  it('accepts a file of any size when the caller set no cap', async () => {
    stubFileReader();
    const onChange = vi.fn();
    wrap(
      <SingleImageUploadField
        value=""
        onChange={onChange}
        folder="/pods"
        variant="url-button"
        maxBytes={null}
      />,
      [uploadMock()],
    );
    await settle();

    await pick(pngFile('huge.png', 500 * 1024 * 1024));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(UPLOADED));
  });

  it('shows the server reason when the upload was refused', async () => {
    stubFileReader();
    const onChange = vi.fn();
    wrap(
      <SingleImageUploadField value="" onChange={onChange} folder="/pods" variant="url-button" />,
      [
        uploadMock({
          result: { errors: [{ message: 'That image failed the content scan' } as never] },
        }),
      ],
    );
    await settle();

    await pick(pngFile());

    expect(await screen.findByText('That image failed the content scan')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a failure for an upload that came back with no URL', async () => {
    stubFileReader();
    wrap(
      <SingleImageUploadField value="" onChange={vi.fn()} folder="/pods" variant="url-button" />,
      [
        uploadMock({
          result: { data: { uploadImageToImagekit: null } },
        }),
      ],
    );
    await settle();

    await pick(pngFile());

    expect(await screen.findByText('No URL returned from ImageKit upload')).toBeInTheDocument();
  });
});

describe('SingleImageUploadField avatar chrome', () => {
  const avatar = (value: string, onChange = vi.fn(), extra: Record<string, unknown> = {}) =>
    wrap(
      <SingleImageUploadField
        value={value}
        onChange={onChange}
        folder="/pods"
        variant="avatar"
        label="Cover"
        {...extra}
      />,
    );

  it('offers Upload on an empty field and Replace once there is a picture', async () => {
    avatar('');
    await settle();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();

    document.body.innerHTML = '';
    avatar(IMG);
    await settle();
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
  });

  it('clears the picture upward when Remove is pressed', async () => {
    const onChange = vi.fn();
    avatar(IMG, onChange);
    await settle();

    fireEvent.click(screen.getByLabelText('Remove image'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('offers no Remove while there is nothing to remove', async () => {
    avatar('');
    await settle();

    expect(screen.queryByLabelText('Remove image')).not.toBeInTheDocument();
  });

  it('renders both avatar shapes, and the placeholder while empty', async () => {
    avatar(IMG, vi.fn(), { shape: 'circle' });
    await settle();
    expect(document.body.querySelector('img')).not.toBeNull();

    document.body.innerHTML = '';
    avatar('', vi.fn(), { shape: 'circle' });
    await settle();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders the caller helper text', async () => {
    avatar(IMG, vi.fn(), { helperText: 'Square, at least 512px' });
    await settle();

    expect(screen.getByText('Square, at least 512px')).toBeInTheDocument();
  });

  it('lets the reader dismiss a failure without leaving the field', async () => {
    avatar('', vi.fn(), { maxBytes: 1024 });
    await settle();
    await pick(pngFile('huge.png', 4096));
    expect(screen.getByText('huge.png is too large (max 0 MB)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await settle();

    expect(screen.queryByText('huge.png is too large (max 0 MB)')).not.toBeInTheDocument();
  });
});

describe('SingleImageUploadField url chromes', () => {
  it('reports a pasted URL upward from the button chrome', async () => {
    const onChange = vi.fn();
    wrap(
      <SingleImageUploadField
        value=""
        onChange={onChange}
        folder="/pods"
        variant="url-button"
        label="Cover"
      />,
    );
    await settle();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: IMG } });

    expect(onChange).toHaveBeenCalledWith(IMG);
  });

  it('shows the caller helper text until there is an error to show instead', async () => {
    wrap(
      <SingleImageUploadField
        value=""
        onChange={vi.fn()}
        folder="/pods"
        variant="url-button"
        helperText="PNG or JPG"
        maxBytes={1024}
      />,
    );
    await settle();
    expect(screen.getByText('PNG or JPG')).toBeInTheDocument();

    await pick(pngFile('huge.png', 4096));

    expect(screen.queryByText('PNG or JPG')).not.toBeInTheDocument();
    expect(screen.getByText('huge.png is too large (max 0 MB)')).toBeInTheDocument();
  });

  it('opens the current image in a new tab from the adornment chrome', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    wrap(<SingleImageUploadField value={IMG} onChange={vi.fn()} folder="/pods" />);
    await settle();

    fireEvent.click(screen.getByLabelText('Open'));

    expect(open).toHaveBeenCalledWith(IMG, '_blank');
  });

  it('offers nothing to open while the field is empty', async () => {
    wrap(<SingleImageUploadField value="" onChange={vi.fn()} folder="/pods" />);
    await settle();

    expect(screen.queryByLabelText('Open')).not.toBeInTheDocument();
  });

  it.each(['avatar', 'url-button', 'url-adornment'] as SingleImageVariant[])(
    'opens the device picker from the %s chrome',
    async (variant) => {
      wrap(<SingleImageUploadField value="" onChange={vi.fn()} folder="/pods" variant={variant} />);
      await settle();
      const click = vi.spyOn(fileInput(), 'click');

      const trigger =
        variant === 'url-adornment'
          ? document.body.querySelectorAll('button')[0]
          : screen.getByRole('button', { name: variant === 'avatar' ? 'Upload' : 'Upload' });
      fireEvent.click(trigger);

      expect(click).toHaveBeenCalled();
    },
  );
});
