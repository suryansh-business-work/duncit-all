import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import UploadField from '../../src/components/UploadField';

const UPLOAD_IMAGE = gql`
  mutation UploadImageToImagekit(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
    $allow_documents: Boolean
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
      allow_documents: $allow_documents
    ) {
      url
    }
  }
`;

const uploadMock = (url: string | null): MockedResponse => ({
  request: { query: UPLOAD_IMAGE },
  variableMatcher: () => true,
  result: { data: { uploadImageToImagekit: url === null ? null : { url } } },
});

const errorMock: MockedResponse = {
  request: { query: UPLOAD_IMAGE },
  variableMatcher: () => true,
  error: new Error('network down'),
};

function setup(props: Partial<React.ComponentProps<typeof UploadField>> = {}, mocks: MockedResponse[] = []) {
  const onChange = props.onChange ?? vi.fn();
  const utils = render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <UploadField value={props.value ?? []} onChange={onChange} {...props} />
    </MockedProvider>
  );
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { ...utils, onChange, input };
}

const pngFile = (name = 'a.png') => new File(['hello'], name, { type: 'image/png' });

afterEach(() => vi.unstubAllGlobals());

describe('UploadField', () => {
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

  it('does not append when the server returns no URL', async () => {
    const onChange = vi.fn();
    const { input } = setup({ onChange }, [uploadMock('')]);
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await waitFor(() => expect(screen.queryByText('Add')).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByText(/network down/i)).toBeInTheDocument());
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
        <UploadField value={[]} onChange={vi.fn()} disabled />
      </MockedProvider>
    );
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });
});
