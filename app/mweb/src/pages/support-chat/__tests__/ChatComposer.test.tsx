import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatComposer from '../ChatComposer';
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

function fileOf(name: string, type: string, size: number): File {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

function setup(mocks: MockedResponse[] = []) {
  const onSend = vi.fn();
  render(
    <MockedProvider mocks={mocks}>
      <ChatComposer onSend={onSend} onTyping={vi.fn()} />
    </MockedProvider>,
  );
  return { onSend };
}

describe('ChatComposer — attachment size guards', () => {
  it('rejects a video larger than 50 MB', () => {
    setup();
    fireEvent.change(fileInput(), {
      target: { files: [fileOf('clip.mp4', 'video/mp4', 51 * 1024 * 1024)] },
    });
    expect(screen.getByText('Video is too large (max 50 MB)')).toBeInTheDocument();
  });

  it('rejects a non-video file larger than 100 MB', () => {
    setup();
    fireEvent.change(fileInput(), {
      target: { files: [fileOf('big.pdf', 'application/pdf', 101 * 1024 * 1024)] },
    });
    expect(screen.getByText('File is too large (max 100 MB)')).toBeInTheDocument();
  });

  it('accepts image, video and document types', () => {
    setup();
    const accept = fileInput().getAttribute('accept') ?? '';
    expect(accept).toContain('video/*');
    expect(accept).toContain('application/pdf');
    expect(accept).toContain('.xlsx');
  });
});

describe('ChatComposer — document upload + send', () => {
  it('uploads a document directly to ImageKit and sends it as an attachment', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: 'https://cdn/support-chat/notes.pdf' }) }),
    );
    const { onSend } = setup([authMock]);
    fireEvent.change(fileInput(), {
      target: { files: [fileOf('notes.pdf', 'application/pdf', 2048)] },
    });
    expect(await screen.findByText('Attachment 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('', ['https://cdn/support-chat/notes.pdf']);
  });
});
