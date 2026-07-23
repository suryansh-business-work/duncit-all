import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

// The field renders MediaPickerDialog, which re-exports @duncit/media-picker.
// Stub it with a tiny controllable dialog: shows its open state, echoes the
// folder/title props, and exposes a button that fires onPicked / onClose.
vi.mock('@duncit/media-picker', () => ({
  __esModule: true,
  default: ({ open, onClose, onPicked, folder, title }: any) =>
    open ? (
      <div data-testid="picker">
        <span data-testid="picker-folder">{folder}</span>
        <span data-testid="picker-title">{title}</span>
        <button type="button" onClick={() => onPicked('https://ik.example/new.jpg')}>
          pick-image
        </button>
        <button type="button" onClick={() => onPicked('https://ik.example/clip.mp4')}>
          pick-video
        </button>
        <button type="button" onClick={onClose}>
          close-picker
        </button>
      </div>
    ) : null,
}));

import MediaUrlsField from '../MediaUrlsField';

/** Controlled harness that owns the media_text string and re-renders the field. */
function Harness({
  initial = '',
  error,
  label,
  folder,
  onChangeSpy,
}: {
  initial?: string;
  error?: string;
  label?: string;
  folder?: string;
  onChangeSpy?: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <MediaUrlsField
      value={value}
      onChange={(v) => {
        onChangeSpy?.(v);
        setValue(v);
      }}
      error={error}
      label={label}
      folder={folder}
    />
  );
}

describe('MediaUrlsField', () => {
  it('renders the empty dropzone with default label and hint', () => {
    render(<Harness />);
    expect(screen.getByText('Cover image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload an image' })).toBeInTheDocument();
    expect(screen.getByText(/Min 800×400px/)).toBeInTheDocument();
    // Empty state: no thumbnails / add tile.
    expect(screen.queryByLabelText('Add media')).not.toBeInTheDocument();
  });

  it('respects a custom label', () => {
    render(<Harness label="Pod media" />);
    expect(screen.getByText('Pod media')).toBeInTheDocument();
  });

  it('opens the picker on click and passes folder + title through', () => {
    render(<Harness folder="/custom" />);
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload an image' }));
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(screen.getByTestId('picker-folder')).toHaveTextContent('/custom');
    expect(screen.getByTestId('picker-title')).toHaveTextContent('Add pod media');
  });

  it('defaults the folder to /pods', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload an image' }));
    expect(screen.getByTestId('picker-folder')).toHaveTextContent('/pods');
  });

  it('opens the picker via keyboard (Enter and Space) and ignores other keys', () => {
    render(<Harness />);
    const zone = screen.getByRole('button', { name: 'Upload an image' });
    fireEvent.keyDown(zone, { key: 'a' });
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close-picker'));
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
    fireEvent.keyDown(zone, { key: ' ' });
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('adds a picked image URL and renders it as an <img> thumbnail', () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload an image' }));
    fireEvent.click(screen.getByText('pick-image'));
    expect(onChangeSpy).toHaveBeenCalledWith('https://ik.example/new.jpg');
    const img = screen.getByAltText('Pod media') as HTMLImageElement;
    expect(img).toHaveAttribute('src', 'https://ik.example/new.jpg');
    // Populated state now shows the add-more tile.
    expect(screen.getByLabelText('Add media')).toBeInTheDocument();
  });

  it('renders a video URL as a video icon instead of an image', () => {
    render(<Harness initial="https://ik.example/clip.mp4" />);
    expect(screen.queryByAltText('Pod media')).not.toBeInTheDocument();
    expect(screen.getByTestId('VideocamIcon')).toBeInTheDocument();
  });

  it('appends additional URLs via the add-more tile (click + keyboard)', () => {
    const onChangeSpy = vi.fn();
    render(<Harness initial="https://ik.example/a.jpg" onChangeSpy={onChangeSpy} />);
    const addTile = screen.getByLabelText('Add media');
    fireEvent.keyDown(addTile, { key: 'Enter' });
    fireEvent.click(screen.getByText('pick-video'));
    expect(onChangeSpy).toHaveBeenCalledWith('https://ik.example/a.jpg\nhttps://ik.example/clip.mp4');
    // Now one image + one video icon rendered.
    expect(screen.getByAltText('Pod media')).toBeInTheDocument();
    expect(screen.getByTestId('VideocamIcon')).toBeInTheDocument();
  });

  it('removes a URL when its close button is clicked', () => {
    const onChangeSpy = vi.fn();
    render(
      <Harness
        initial={'https://ik.example/a.jpg\nhttps://ik.example/b.jpg'}
        onChangeSpy={onChangeSpy}
      />,
    );
    const removeButtons = screen.getAllByLabelText('Remove media');
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[0]);
    expect(onChangeSpy).toHaveBeenCalledWith('https://ik.example/b.jpg');
  });

  it('trims and filters blank lines from the incoming value', () => {
    render(<Harness initial={'  https://ik.example/a.jpg  \n\n  \n'} />);
    // Only one real URL survives splitLines -> one thumbnail.
    expect(screen.getAllByLabelText('Remove media')).toHaveLength(1);
    expect(screen.getByAltText('Pod media')).toHaveAttribute('src', 'https://ik.example/a.jpg');
  });

  it('renders the error helper text and applies error styling to the empty dropzone', () => {
    render(<Harness error="Cover image is required" />);
    expect(screen.getByText('Cover image is required')).toBeInTheDocument();
  });
});
