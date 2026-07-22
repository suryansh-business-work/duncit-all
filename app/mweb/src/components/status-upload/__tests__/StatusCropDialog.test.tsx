import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StatusCropDialog from '../StatusCropDialog';

// Controllable hook return values for the mocked media-picker package.
const state: {
  settings: unknown;
  dims: { width: number; height: number } | null;
} = {
  settings: null,
  dims: null,
};

vi.mock('@duncit/media-picker', () => ({
  useUploadSettings: () => state.settings,
  useMediaDimensions: () => state.dims,
  suggestPresetKey: (w: number, h: number, presets: Array<{ key: string }>) =>
    presets.length ? `suggest:${w}x${h}:${presets[0].key}` : null,
  // Lightweight stand-in that surfaces the props we care about and lets us
  // drive onSelectKey / onCropComplete via buttons.
  ImageCropStep: (props: {
    previewUrl: string;
    presets: Array<{ key: string }>;
    selectedKey: string;
    suggestedKey: string | null;
    onSelectKey: (k: string) => void;
    onCropComplete: (r: unknown) => void;
  }) => (
    <div>
      <span data-testid="preview-url">{props.previewUrl}</span>
      <span data-testid="selected-key">{props.selectedKey}</span>
      <span data-testid="suggested-key">{String(props.suggestedKey)}</span>
      <button type="button" onClick={() => props.onSelectKey('SQUARE')}>
        pick-square
      </button>
      <button type="button" onClick={() => props.onSelectKey('DISABLED')}>
        pick-disabled
      </button>
      <button type="button" onClick={() => props.onCropComplete({ x: 1, y: 2, width: 3, height: 4 })}>
        emit-crop
      </button>
    </div>
  ),
}));

beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:status-image');
  globalThis.URL.revokeObjectURL = vi.fn();
});

const settingsFixture = {
  default_crop_key: 'DEFAULT',
  crop_presets: [
    { key: 'SQUARE', enabled: true, width: 100, height: 100 },
    { key: 'DISABLED', enabled: false, width: 100, height: 100 },
    { key: 'DEFAULT', enabled: true, width: 200, height: 100 },
  ],
};

const imageFile = new File(['x'], 'pic.png', { type: 'image/png' });

beforeEach(() => {
  state.settings = settingsFixture;
  state.dims = null;
  vi.clearAllMocks();
});

describe('StatusCropDialog', () => {
  it('stays closed with no file', () => {
    render(<StatusCropDialog file={null} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('Crop status image')).not.toBeInTheDocument();
  });

  it('opens for a file and builds a preview url', () => {
    render(<StatusCropDialog file={imageFile} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText('Crop status image')).toBeInTheDocument();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(imageFile);
    expect(screen.getByTestId('preview-url')).toHaveTextContent('blob:status-image');
  });

  it('falls back to the settings default crop key and no suggestion without dims', () => {
    render(<StatusCropDialog file={imageFile} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByTestId('selected-key')).toHaveTextContent('DEFAULT');
    expect(screen.getByTestId('suggested-key')).toHaveTextContent('null');
  });

  it('computes a suggested key once dims are known', () => {
    state.dims = { width: 640, height: 480 };
    render(<StatusCropDialog file={imageFile} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByTestId('suggested-key')).toHaveTextContent('suggest:640x480:SQUARE');
  });

  it('confirms with crop rect + key when the selected preset is croppable', () => {
    const onConfirm = vi.fn();
    render(<StatusCropDialog file={imageFile} onCancel={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('pick-square'));
    fireEvent.click(screen.getByText('emit-crop'));
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(onConfirm).toHaveBeenCalledWith({ x: 1, y: 2, width: 3, height: 4 }, 'SQUARE');
  });

  it('confirms with nulls when the selected preset is disabled (not croppable)', () => {
    const onConfirm = vi.fn();
    render(<StatusCropDialog file={imageFile} onCancel={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('pick-disabled'));
    fireEvent.click(screen.getByText('emit-crop'));
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(onConfirm).toHaveBeenCalledWith(null, null);
  });

  it('defaults selectedKey to NO_CROP when settings are missing', () => {
    state.settings = null;
    const onConfirm = vi.fn();
    render(<StatusCropDialog file={imageFile} onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByTestId('selected-key')).toHaveTextContent('NO_CROP');
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    // No presets -> not croppable -> nulls.
    expect(onConfirm).toHaveBeenCalledWith(null, null);
  });

  it('cancels via the Cancel button', () => {
    const onCancel = vi.fn();
    render(<StatusCropDialog file={imageFile} onCancel={onCancel} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
