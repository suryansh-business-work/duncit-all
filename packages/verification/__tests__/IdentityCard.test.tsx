/**
 * Identity upload — the path that actually reaches the server, plus the two
 * refusals that must never reach it: a locked row and an oversized file.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.fn();

vi.mock('@duncit/media-picker', () => ({
  useImagekitBase64Upload: () => ({ upload, uploading: false }),
}));

vi.mock('@duncit/ai-monitoring/mui', () => ({
  AiMonitoringChip: () => <span>AI Monitoring</span>,
}));

const { default: IdentityCard } = await import('../src/mui/IdentityCard');
const { SUBMIT_VERIFICATION } = await import('../src/mui/queries');
const { MAX_DOC_BYTES } = await import('../src');
type Verification = import('../src').Verification;

const row = (over: Partial<Verification> = {}): Verification => ({
  type: 'IDENTITY',
  status: 'NOT_SUBMITTED',
  document_url: null,
  reject_reason: null,
  address: null,
  ...over,
});

const submitMock: MockedResponse = {
  request: {
    query: SUBMIT_VERIFICATION,
    variables: { type: 'IDENTITY', document_url: 'https://ik.duncit.com/verifications/id.png' },
  },
  result: { data: { submitVerification: { type: 'IDENTITY', status: 'PENDING' } } },
};

function setup(item: Verification, mocks: MockedResponse[] = [submitMock]) {
  const onChanged = vi.fn();
  const onError = vi.fn();
  render(
    <MockedProvider mocks={mocks}>
      <IdentityCard item={item} onChanged={onChanged} onError={onError} />
    </MockedProvider>,
  );
  return { onChanged, onError };
}

/** A picked file of a given size — jsdom's File does not let size be set directly. */
function fileOf(size: number): File {
  const file = new File(['x'], 'id.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const pick = (file: File) => {
  const input = screen.getByTestId('verification-file-input');
  fireEvent.change(input, { target: { files: [file] } });
};

beforeEach(() => {
  vi.clearAllMocks();
  upload.mockResolvedValue({ url: 'https://ik.duncit.com/verifications/id.png' });
});

describe('IdentityCard', () => {
  it('offers a first upload before anything was submitted', () => {
    setup(row());
    expect(screen.getByRole('button', { name: /Upload document/ })).toBeInTheDocument();
  });

  it('offers a replacement once a submission was rejected', () => {
    setup(row({ status: 'REJECTED', reject_reason: 'Blurred scan' }));
    expect(screen.getByRole('button', { name: /Re-upload/ })).toBeInTheDocument();
    expect(screen.getByText('Blurred scan')).toBeInTheDocument();
  });

  it('takes the picker away while approved, so nothing replaces a verified document', () => {
    setup(row({ status: 'APPROVED' }));
    expect(screen.queryByTestId('verification-file-input')).not.toBeInTheDocument();
  });

  it('takes the picker away while under review — the admin is mid-decision', () => {
    setup(row({ status: 'PENDING' }));
    expect(screen.queryByTestId('verification-file-input')).not.toBeInTheDocument();
  });

  it('uploads the file and submits the returned URL', async () => {
    const { onChanged, onError } = setup(row());
    pick(fileOf(1024));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(upload).toHaveBeenCalledWith(expect.any(File), {
      folder: '/verifications',
      allowDocuments: true,
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('refuses a file over the cap without uploading it', async () => {
    const { onChanged, onError } = setup(row());
    pick(fileOf(MAX_DOC_BYTES + 1));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith('Please upload a document under 4 MB.'),
    );
    expect(upload).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('surfaces the upload failure to the host', async () => {
    upload.mockRejectedValue(new Error('ImageKit is unreachable'));
    const { onChanged, onError } = setup(row());
    pick(fileOf(1024));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('ImageKit is unreachable'));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('falls back to the localized message when the failure carries no message', async () => {
    upload.mockRejectedValue('boom');
    const { onError } = setup(row());
    pick(fileOf(1024));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Could not submit the document.'));
  });

  it('ignores a cancelled picker — no file, no upload', () => {
    const { onChanged } = setup(row());
    fireEvent.change(screen.getByTestId('verification-file-input'), { target: { files: [] } });
    expect(upload).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('opens the picker from the button', () => {
    setup(row());
    const input = screen.getByTestId('verification-file-input') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: /Upload document/ }));
    expect(click).toHaveBeenCalled();
  });
});
