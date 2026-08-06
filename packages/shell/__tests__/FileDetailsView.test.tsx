import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import FileDetailsView from '../src/file-manager/FileDetailsView';
import type { MediaItem } from '../src/file-manager/queries';

const file = (n: number): MediaItem => ({
  fileId: `f${n}`,
  name: `photo-${n}.jpg`,
  filePath: `/x/photo-${n}.jpg`,
  url: `https://ik.test/photo-${n}.jpg`,
  thumbnail: null,
  type: 'file',
  fileType: 'image',
  mime: 'image/jpeg',
  size: 1024,
  width: 800,
  height: 600,
  tags: [],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: null,
  versionId: 'v1',
});

const props = {
  canWrite: false,
  onBack: vi.fn(),
  onCopy: vi.fn(),
  onDelete: vi.fn(),
  onChanged: vi.fn(),
  onError: vi.fn(),
};

const show = (active: MediaItem, siblings: MediaItem[], onNavigate = vi.fn()) => {
  render(
    <MockedProvider mocks={[]}>
      <FileDetailsView {...props} file={active} siblings={siblings} onNavigate={onNavigate} />
    </MockedProvider>
  );
  return onNavigate;
};

describe('FileDetailsView stepper', () => {
  it('walks the ticked files without going back to the grid', () => {
    const files = [file(1), file(2), file(3)];
    const onNavigate = show(files[1], files);

    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next selected file' }));
    expect(onNavigate).toHaveBeenCalledWith(files[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Previous selected file' }));
    expect(onNavigate).toHaveBeenCalledWith(files[0]);
  });

  it('stops at both ends rather than wrapping', () => {
    const files = [file(1), file(2)];
    show(files[0], files);
    expect(screen.getByRole('button', { name: 'Previous selected file' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next selected file' })).toBeEnabled();
  });

  it('shows no stepper for a file that is not part of the selection', () => {
    // A stepper that cannot say where you are in the set is worse than none.
    show(file(9), [file(1), file(2)]);
    expect(screen.queryByRole('button', { name: 'Next selected file' })).not.toBeInTheDocument();
  });

  it('shows no stepper when only one file is ticked', () => {
    const only = file(1);
    show(only, [only]);
    expect(screen.queryByRole('button', { name: 'Next selected file' })).not.toBeInTheDocument();
  });
});
