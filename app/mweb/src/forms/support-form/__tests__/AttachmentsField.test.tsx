import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AttachmentsField from '../AttachmentsField';
import { GET_IMAGEKIT_AUTH } from '../../../utils/imagekit';

const authMock: MockedResponse = {
  request: { query: GET_IMAGEKIT_AUTH },
  variableMatcher: () => true,
  result: {
    data: {
      getImagekitAuth: {
        token: 't',
        expire: 1,
        signature: 's',
        publicKey: 'pk',
        urlEndpoint: 'https://ik',
      },
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function Harness({ initial = [] as string[], mocks = [] as MockedResponse[] }: Readonly<{ initial?: string[]; mocks?: MockedResponse[] }>) {
  const [attachments, setAttachments] = useState<string[]>(initial);
  return (
    <MockedProvider mocks={mocks}>
      <AttachmentsField attachments={attachments} setAttachments={setAttachments} />
    </MockedProvider>
  );
}

function fileOf(name: string, type: string, size: number): File {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

describe('AttachmentsField — rename to files', () => {
  it('renders the "Attach files" caption and "Add files" button', () => {
    render(<Harness />);
    expect(screen.getByText('Attach files (0/5)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add files/i })).toBeInTheDocument();
  });

  it('accepts images, video and documents on the file input', () => {
    render(<Harness />);
    const accept = fileInput().getAttribute('accept') ?? '';
    expect(accept).toContain('image/*');
    expect(accept).toContain('video/*');
    expect(accept).toContain('application/pdf');
    expect(accept).toContain('.docx');
  });
});

describe('AttachmentsField — size guards', () => {
  it('rejects a video larger than 50 MB', () => {
    render(<Harness />);
    fireEvent.change(fileInput(), {
      target: { files: [fileOf('clip.mp4', 'video/mp4', 51 * 1024 * 1024)] },
    });
    expect(screen.getByText('Video is too large (max 50 MB)')).toBeInTheDocument();
  });

  it('rejects a non-video file larger than 100 MB', () => {
    render(<Harness />);
    fireEvent.change(fileInput(), {
      target: { files: [fileOf('big.pdf', 'application/pdf', 101 * 1024 * 1024)] },
    });
    expect(screen.getByText('File is too large (max 100 MB)')).toBeInTheDocument();
  });
});

describe('AttachmentsField — upload + previews', () => {
  it('uploads a document directly to ImageKit and shows a file chip preview', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: 'https://cdn/support/report.pdf' }) }),
    );
    render(<Harness mocks={[authMock]} />);
    fireEvent.change(fileInput(), {
      target: { files: [fileOf('report.pdf', 'application/pdf', 1024)] },
    });
    expect(await screen.findByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('renders image thumbnails and file chips per attachment kind', () => {
    render(
      <Harness initial={['https://cdn/support/shot.png', 'https://cdn/support/clip.mp4', 'https://cdn/support/doc.pdf']} />,
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('clip.mp4')).toBeInTheDocument();
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Remove attachment')).toHaveLength(3);
  });

  it('removes an attachment when its remove button is clicked', () => {
    render(<Harness initial={['https://cdn/support/doc.pdf']} />);
    fireEvent.click(screen.getByLabelText('Remove attachment'));
    expect(screen.queryByText('doc.pdf')).not.toBeInTheDocument();
  });
});
