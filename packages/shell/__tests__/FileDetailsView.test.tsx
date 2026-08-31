import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router-dom';
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
    // The tab strip keeps its selection in the URL (useTabParam), so the view
    // only renders under a router.
    <MemoryRouter>
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <FileDetailsView {...props} file={active} siblings={siblings} onNavigate={onNavigate} />
      </MockedProvider>
    </MemoryRouter>
  );
  return onNavigate;
};

describe('FileDetailsView info', () => {
  it('shows the image and a download that actually saves it', () => {
    show(file(1), []);
    expect(screen.getByAltText('photo-1.jpg')).toBeInTheDocument();
    // ImageKit's attachment flag, not the download attribute — that one is
    // ignored across origins and the file would open in a tab instead.
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute(
      'href',
      'https://ik.test/photo-1.jpg?ik-attachment=true'
    );
  });

  it('has no Customize tab', () => {
    show(file(1), []);
    expect(screen.queryByRole('tab', { name: 'Customize' })).not.toBeInTheDocument();
  });
});

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

describe('FileDetailsView tags', () => {
  it('edits tags as chips, so dropping one does not mean retyping the rest', () => {
    const tagged = { ...file(1), tags: ['hero', 'banner'] };
    render(
      <MemoryRouter>
        <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
          <FileDetailsView {...props} canWrite file={tagged} />
        </MockedProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Edit' }));

    // Each tag is its own chip with its own delete, not one comma-joined string.
    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.getByText('banner')).toBeInTheDocument();
    expect(screen.getAllByTestId('CancelIcon')).toHaveLength(2);
  });
});
