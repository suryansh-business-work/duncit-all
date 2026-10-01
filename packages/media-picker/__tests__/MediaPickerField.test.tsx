/**
 * The URL field with a picker behind it — the one implementation the admin,
 * marketing and onboarding portals each bind to their own copy.
 *
 * The dialog has suites of its own, so it is stubbed here: what is worth
 * pinning down is the hand-off (which title, folder and accept the dialog is
 * opened with, and that a picked URL goes straight back out through onChange)
 * and that every word the field shows is the host portal's.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MediaPickerDialogProps } from '../src/types';

const PICKED = 'https://ik.imagekit.io/duncit/marketing/diwali-banner.jpg';
const CURRENT = 'https://ik.imagekit.io/duncit/marketing/monsoon-banner.jpg';

vi.mock('../src/MediaPickerDialog', () => ({
  default: ({ open, onClose, onPicked, title, folder, accept }: Readonly<MediaPickerDialogProps>) =>
    open ? (
      <div role="dialog" aria-label={title} data-folder={folder} data-accept={accept}>
        <button type="button" onClick={() => onPicked(PICKED)}>
          pick-image
        </button>
        <button type="button" onClick={onClose}>
          close-picker
        </button>
      </div>
    ) : null,
}));

import MediaPickerField from '../src/MediaPickerField';

const testTheme = createTheme();

const labels = {
  placeholder: 'Click the image icon to upload, or paste a URL…',
  pick: 'Pick from device or Pexels',
  open: 'Open',
};

const field = (props: Partial<Parameters<typeof MediaPickerField>[0]> = {}) => {
  const onChange = vi.fn();
  const view = render(
    <ThemeProvider theme={testTheme}>
      <MediaPickerField label="Banner" value="" onChange={onChange} labels={labels} {...props} />
    </ThemeProvider>
  );
  return { ...view, onChange };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MediaPickerField — button only', () => {
  it('opens the picker under the field label and reports the picked URL', () => {
    const { onChange } = field({ buttonOnly: true, folder: '/marketing', accept: 'image/*' });

    expect(screen.queryByLabelText('Banner')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Choose image' }));

    const dialog = screen.getByRole('dialog', { name: 'Banner' });
    expect(dialog).toHaveAttribute('data-folder', '/marketing');
    expect(dialog).toHaveAttribute('data-accept', 'image/*');

    fireEvent.click(screen.getByText('pick-image'));
    expect(onChange).toHaveBeenCalledWith(PICKED);

    fireEvent.click(screen.getByText('close-picker'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("shows the caller's own button label", () => {
    field({ buttonOnly: true, buttonLabel: 'Upload artwork' });

    expect(screen.getByRole('button', { name: 'Upload artwork' })).toBeInTheDocument();
  });
});

describe('MediaPickerField — URL field', () => {
  it("renders the host portal's copy", () => {
    field({ value: CURRENT, helperText: 'Shown at the top of the campaign.' });

    expect(screen.getByPlaceholderText(labels.placeholder)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.pick)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.open)).toBeInTheDocument();
    expect(screen.getByText('Shown at the top of the campaign.')).toBeInTheDocument();
  });

  it('opens the picker from the icon and closes it again', () => {
    const { onChange } = field({ folder: '/marketing' });

    fireEvent.click(screen.getByLabelText(labels.pick));
    const dialog = screen.getByRole('dialog', { name: 'Choose · Banner' });
    expect(dialog).toHaveAttribute('data-folder', '/marketing');
    expect(dialog).not.toHaveAttribute('data-accept');

    fireEvent.click(screen.getByText('pick-image'));
    expect(onChange).toHaveBeenCalledWith(PICKED);

    fireEvent.click(screen.getByText('close-picker'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reports a typed URL', () => {
    const { onChange } = field({ required: true });

    fireEvent.change(screen.getByRole('textbox', { name: /Banner/ }), { target: { value: CURRENT } });

    expect(onChange).toHaveBeenCalledWith(CURRENT);
  });

  it('opens the current URL in a new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    field({ value: CURRENT });

    fireEvent.click(screen.getByLabelText(labels.open));

    expect(openSpy).toHaveBeenCalledWith(CURRENT, '_blank');
  });

  it('offers nothing to open while the field is empty', () => {
    field();

    expect(screen.queryByLabelText(labels.open)).toBeNull();
    expect(screen.queryByAltText('preview')).toBeNull();
  });

  it('previews the current image unless told not to', () => {
    const { unmount } = field({ value: CURRENT });
    expect(screen.getByAltText('preview')).toHaveAttribute('src', CURRENT);
    unmount();

    field({ value: CURRENT, showPreview: false });
    expect(screen.queryByAltText('preview')).toBeNull();
  });
});
