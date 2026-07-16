import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { AttachmentUploadField, ATTACHMENT_ACCEPT_ALL, UPLOAD_IMAGE } from '@duncit/media-picker';

const uploadMock = (url: string | null): MockedResponse => ({
  request: { query: UPLOAD_IMAGE },
  variableMatcher: () => true,
  result: {
    data: {
      uploadImageToImagekit: url === null ? null : { url, fileId: null, thumbnailUrl: null },
    },
  },
});

const errorMock: MockedResponse = {
  request: { query: UPLOAD_IMAGE },
  variableMatcher: () => true,
  error: new Error('network down'),
};

// The support-portal configuration of the shared field (images, videos and
// documents, capped at 100 MB per file — support spec).
const supportProps = {
  accept: ATTACHMENT_ACCEPT_ALL,
  maxBytes: 100 * 1024 * 1024,
  allowDocuments: true,
} as const;

function setup(
  props: Partial<React.ComponentProps<typeof AttachmentUploadField>> = {},
  mocks: MockedResponse[] = [],
) {
  const onChange = props.onChange ?? vi.fn();
  const utils = render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AttachmentUploadField {...supportProps} value={props.value ?? []} onChange={onChange} {...props} />
    </MockedProvider>
  );
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { ...utils, onChange, input };
}

const pngFile = (name = 'a.png') => new File(['hello'], name, { type: 'image/png' });

afterEach(() => vi.unstubAllGlobals());

describe('UploadField (shared AttachmentUploadField, support config)', () => {
  it('shows the count and a custom label', () => {
    setup({ label: 'Attach screenshots' });
    expect(screen.getByText('Attach screenshots (0/5)')).toBeInTheDocument();
  });

  it('renders existing attachments and removes one', () => {
    const onChange = vi.fn();
    setup({ value: ['https://img/a.png', 'https://img/b.png'], onChange });
    expect(screen.getByText('Attach files (2/5)')).toBeInTheDocument();
    fireEvent.click(screen.getAllByLabelText('Remove attachment')[0]);
    expect(onChange).toHaveBeenCalledWith(['https://img/b.png']);
  });

  it('renders a document attachment as a removable file chip', () => {
    const onChange = vi.fn();
    setup({ value: ['https://img/report.pdf'], onChange });
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    // The chip's delete affordance removes it.
    fireEvent.click(screen.getByTestId('CancelIcon'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('uploads a picked file and appends the returned URL', async () => {
    const onChange = vi.fn();
    const { input } = setup({ onChange }, [uploadMock('https://img/uploaded.png')]);
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['https://img/uploaded.png']));
  });

  it('surfaces an error when the server returns no URL', async () => {
    const onChange = vi.fn();
    const { input } = setup({ onChange }, [uploadMock('')]);
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await waitFor(() => expect(screen.getByText(/no url returned/i)).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a file that is too large', async () => {
    const onChange = vi.fn();
    const big = pngFile('big.png');
    Object.defineProperty(big, 'size', { value: 101 * 1024 * 1024 });
    const { input } = setup({ onChange });
    fireEvent.change(input, { target: { files: [big] } });
    await waitFor(() => expect(screen.getByText(/too large/i)).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('surfaces an upload failure', async () => {
    const { input } = setup({}, [errorMock]);
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });

  it('surfaces a file-read failure', async () => {
    class FailingReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.onerror?.();
      }
    }
    vi.stubGlobal('FileReader', FailingReader);
    const { input } = setup({});
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await waitFor(() => expect(screen.getByText(/could not read selected file/i)).toBeInTheDocument());
  });

  it('ignores an empty selection', () => {
    const onChange = vi.fn();
    const { input } = setup({ onChange });
    fireEvent.change(input, { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables the Add button at the max and when disabled', () => {
    const { rerender } = setup({ value: ['1', '2', '3', '4', '5'] });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    rerender(
      <MockedProvider mocks={[]} addTypename={false}>
        <AttachmentUploadField {...supportProps} value={[]} onChange={vi.fn()} disabled />
      </MockedProvider>
    );
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});
