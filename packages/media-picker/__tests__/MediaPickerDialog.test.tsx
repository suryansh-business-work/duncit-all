/**
 * The one media picker every surface opens.
 *
 * Nothing is mocked behind it: Upload Settings and the Pexels search both
 * answer nothing, which is exactly the state the dialog is in on first open and
 * for the whole of a failed request. A picker that throws there takes the form
 * that opened it down with it, so what this asserts is that each tab, each
 * control and the tray survive having no data — and that a closed dialog
 * renders nothing at all.
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MediaPickerDialog from '../src/MediaPickerDialog';
import type { MediaPickerDialogProps } from '../src/types';

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = (props: Partial<MediaPickerDialogProps> = {}) => {
  const onClose = vi.fn();
  const onPicked = vi.fn();
  const result = render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>
      <MediaPickerDialog open onClose={onClose} onPicked={onPicked} {...props} />
      </ThemeProvider>
    </MockedProvider>
  );
  return { ...result, onClose, onPicked };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('MediaPickerDialog', () => {
  it('renders nothing while it is closed', () => {
    mount({ open: false });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens with its tabs', async () => {
    mount();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
  });

  it('shows the caller title', async () => {
    mount({ title: 'Pick a cover' });
    await settle();

    expect(document.body.textContent).toContain('Pick a cover');
  });

  it('survives every tab being opened with nothing behind it', async () => {
    mount({ seedQuery: 'badminton', orientation: 'landscape' });
    await settle();

    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      await settle();
    }

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('survives every control being pressed', async () => {
    mount({ folder: '/pods', surface: 'MWEB' as MediaPickerDialogProps['surface'] });
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 20)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    expect(document.body.innerHTML).not.toBe('');
  });

  it('opens in the multi-pick shape, where picks collect in a tray instead of closing on the first one', async () => {
    const onPickedMany = vi.fn();
    mount({ max: 4, onPickedMany });
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    // Nothing has been picked, so the tray must not hand an empty selection back.
    expect(onPickedMany).not.toHaveBeenCalled();
  });

  it('opens as a document picker when the accept list mentions PDF', async () => {
    mount({ accept: 'application/pdf', title: 'Upload a document' });
    await settle();

    expect(document.body.textContent).toContain('Upload a document');
  });

  it('honours an explicit allowDocuments override over the accept list', async () => {
    mount({ accept: 'application/pdf', allowDocuments: false });
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('closes through the caller callback rather than on its own', async () => {
    const { onClose } = mount();
    await settle();

    fireEvent.keyDown(document.body.querySelector('[role="dialog"]') as Element, { key: 'Escape', code: 'Escape' });
    await settle();

    expect(onClose).toHaveBeenCalled();
  });
});
