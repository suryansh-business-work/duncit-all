import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StatusVideoPreviewDialog from '../StatusVideoPreviewDialog';

beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:video');
  globalThis.URL.revokeObjectURL = vi.fn();
});

const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });

const loadMetadata = (durationSeconds: number) => {
  const video = document.querySelector('video') as HTMLVideoElement;
  Object.defineProperty(video, 'duration', { value: durationSeconds, configurable: true });
  fireEvent.loadedMetadata(video);
  return video;
};

describe('StatusVideoPreviewDialog', () => {
  it('stays closed without a file', () => {
    render(<StatusVideoPreviewDialog file={null} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText(/preview your video story/i)).not.toBeInTheDocument();
  });

  it('posts a short clip as-is (no trim UI)', () => {
    const onConfirm = vi.fn();
    render(<StatusVideoPreviewDialog file={file} onCancel={vi.fn()} onConfirm={onConfirm} />);
    loadMetadata(10);
    expect(screen.queryByLabelText('Trim start')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /post story/i }));
    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('requires a 15s window for a long clip and posts the picked trim', () => {
    const onConfirm = vi.fn();
    render(<StatusVideoPreviewDialog file={file} onCancel={vi.fn()} onConfirm={onConfirm} />);
    const video = loadMetadata(40);
    expect(screen.getByText(/videos can be up to 15 seconds long/i)).toBeInTheDocument();
    expect(screen.getByText('Posting 0:00 – 0:15 of 0:40')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Trim start'), { target: { value: 5 } });
    expect(screen.getByText('Posting 0:05 – 0:20 of 0:40')).toBeInTheDocument();
    expect(video.currentTime).toBe(5);

    fireEvent.click(screen.getByRole('button', { name: /trim & post/i }));
    expect(onConfirm).toHaveBeenCalledWith({ start: 5, duration: 15 });
  });

  it('cancels without posting', () => {
    const onCancel = vi.fn();
    render(<StatusVideoPreviewDialog file={file} onCancel={onCancel} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
