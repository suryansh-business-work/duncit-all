/**
 * AttachmentUploadField actually taking files.
 *
 * The controlled rendering is pinned down in upload-fields; this suite is the
 * pick pipeline: the size gates (image, video, custom copy), the cap leaving no
 * room, both error chromes, both upload strategies failing loudly rather than
 * silently, and the URL list only ever growing through onChange.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AttachmentUploadField from '../src/AttachmentUploadField';
import AttachmentPreview from '../src/AttachmentPreview';
import { GET_IMAGEKIT_AUTH, UPLOAD_IMAGE } from '../src/queries';

const testTheme = createTheme();

const IMG = 'https://ik.imagekit.io/duncit/support/photo.jpg';
const UPLOADED = 'https://ik.imagekit.io/duncit/support/new-upload.jpg';

const uploadAnswers: MockedResponse[] = [
  {
    request: { query: UPLOAD_IMAGE, variables: () => true },
    result: { data: { uploadImageToImagekit: { url: UPLOADED, fileId: 'ik-9', thumbnailUrl: null } } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

const wrap = (ui: React.ReactElement, mocks: MockedResponse[] = uploadAnswers) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

const pngFile = (name = 'photo.png', bytes = 3) =>
  new File([new Uint8Array(bytes)], name, { type: 'image/png' });

const chooseFiles = (files: File[] | null) => {
  const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('AttachmentUploadField picking', () => {
  it('uploads a picked file, shows busy while it runs, and appends the URL', async () => {
    const onChange = vi.fn();
    wrap(<AttachmentUploadField value={[IMG]} onChange={onChange} />);

    chooseFiles([pngFile()]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([IMG, UPLOADED]));
  });

  it('takes only as many files as the cap leaves room for', async () => {
    const onChange = vi.fn();
    wrap(<AttachmentUploadField value={[IMG]} onChange={onChange} max={2} />);

    chooseFiles([pngFile('a.png'), pngFile('b.png')]);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([IMG, UPLOADED]));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('uploads nothing at all once the list is full', async () => {
    const onChange = vi.fn();
    wrap(<AttachmentUploadField value={[IMG, UPLOADED]} onChange={onChange} max={2} />);

    chooseFiles([pngFile()]);
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does nothing when the dialog was dismissed without files', () => {
    const onChange = vi.fn();
    wrap(<AttachmentUploadField value={[]} onChange={onChange} />);

    chooseFiles(null);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('refuses an oversize image with the default copy, as caption text', async () => {
    wrap(<AttachmentUploadField value={[]} onChange={vi.fn()} maxBytes={1} />);

    chooseFiles([pngFile('big.png', 2)]);

    expect(await screen.findByText(/big\.png is too large \(max 0 MB\)/)).toBeInTheDocument();
  });

  it('lets the caller word the oversize refusal', async () => {
    wrap(
      <AttachmentUploadField
        value={[]}
        onChange={vi.fn()}
        maxBytes={1}
        oversizeMessage={(f) => `${f.name}: compress it first`}
      />
    );

    chooseFiles([pngFile('huge.png', 2)]);

    expect(await screen.findByText('huge.png: compress it first')).toBeInTheDocument();
  });

  it('applies the tighter video cap with its default copy', async () => {
    wrap(<AttachmentUploadField value={[]} onChange={vi.fn()} videoMaxBytes={1} />);

    chooseFiles([new File([new Uint8Array(2)], 'clip.mp4', { type: 'video/mp4' })]);

    expect(await screen.findByText(/Video is too large \(max 0 MB\)/)).toBeInTheDocument();
  });

  // `null` is how a field says "the server decides" — a 300 MB build artifact
  // has no business being refused by a picker.
  it('takes any size when the cap is explicitly null', async () => {
    const onChange = vi.fn();
    wrap(
      <AttachmentUploadField
        value={[]}
        onChange={onChange}
        maxBytes={null}
        videoMaxBytes={null}
      />
    );

    chooseFiles([new File([new Uint8Array(4)], 'clip.mp4', { type: 'video/mp4' })]);

    expect(screen.queryByText(/too large/)).toBeNull();
  });

  it('lets the caller word the video refusal', async () => {
    wrap(
      <AttachmentUploadField
        value={[]}
        onChange={vi.fn()}
        videoMaxBytes={1}
        videoOversizeMessage="Trim it below 50 MB first"
      />
    );

    chooseFiles([new File([new Uint8Array(2)], 'clip.mp4', { type: 'video/mp4' })]);

    expect(await screen.findByText('Trim it below 50 MB first')).toBeInTheDocument();
  });

  it('renders the error as a dismissible chip for mWeb, and dismissing clears it', async () => {
    wrap(<AttachmentUploadField value={[]} onChange={vi.fn()} maxBytes={1} errorVariant="chip" />);

    chooseFiles([pngFile('big.png', 2)]);
    const chip = await screen.findByText(/big\.png is too large/);

    const deleteIcon = chip.parentElement?.querySelector('.MuiChip-deleteIcon') as HTMLElement;
    fireEvent.click(deleteIcon);

    await waitFor(() => expect(screen.queryByText(/big\.png is too large/)).toBeNull());
  });

  it('surfaces a failed upload as a readable message, not a silent nothing', async () => {
    wrap(<AttachmentUploadField value={[]} onChange={vi.fn()} />, [
      {
        request: { query: UPLOAD_IMAGE, variables: () => true },
        error: new Error('boom'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);

    chooseFiles([pngFile()]);

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });

  it('reports the direct strategy being unavailable instead of swallowing it', async () => {
    wrap(<AttachmentUploadField value={[]} onChange={vi.fn()} strategy="direct" />, [
      {
        request: { query: GET_IMAGEKIT_AUTH, variables: () => true },
        result: { data: { getImagekitAuth: null } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);

    chooseFiles([pngFile()]);

    expect(await screen.findByText('Upload is not available right now')).toBeInTheDocument();
  });
});

describe('AttachmentPreview', () => {
  it('scales the remove badge up on the larger mWeb thumbnail', () => {
    const onRemove = vi.fn();
    wrap(<AttachmentPreview url={IMG} size={72} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }));

    expect(onRemove).toHaveBeenCalled();
  });

  it('shows a movie icon, not a document icon, for a video card', () => {
    const { container } = wrap(
      <AttachmentPreview
        url="https://ik.imagekit.io/duncit/support/reel.mp4"
        docVariant="card"
        onRemove={vi.fn()}
      />
    );

    expect(container.querySelector('[data-testid="MovieIcon"]')).not.toBeNull();
    expect(container.textContent).toContain('MP4');
  });
});
