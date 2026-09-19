import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../ResponsiveDialog';

/** A phone-width viewport: every `max-width` breakpoint query matches. */
const stubPhoneViewport = () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

const sheetPaper = () => document.querySelector('.MuiDrawer-paper');
const dialogPaper = () => document.querySelector('.MuiDialog-paper');

describe('ResponsiveDialog — desktop', () => {
  it('opens a centred dialog with a titled close button and an actions row', () => {
    const onClose = vi.fn();
    render(
      <ResponsiveDialog open onClose={onClose} title="Review request" actions={<DuncitButton>Approve</DuncitButton>}>
        Request details
      </ResponsiveDialog>,
    );

    expect(dialogPaper()).toBeInTheDocument();
    expect(sheetPaper()).toBeNull();
    expect(screen.getByText('Review request')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('drops the title row and the actions row when neither is given', () => {
    render(
      <ResponsiveDialog open onClose={vi.fn()}>
        Just the body
      </ResponsiveDialog>,
    );
    expect(screen.getByText('Just the body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(document.querySelector('.MuiDialogActions-root')).toBeNull();
  });

  it('stays a dialog on a phone when desktopOnly is set', async () => {
    stubPhoneViewport();
    render(
      <ResponsiveDialog open onClose={vi.fn()} title="Settings" desktopOnly>
        Body
      </ResponsiveDialog>,
    );
    await waitFor(() => expect(dialogPaper()).toBeInTheDocument());
    expect(sheetPaper()).toBeNull();
  });
});

describe('ResponsiveDialog — bottom sheet', () => {
  it('slides up as a sheet on a phone, labelled by its title', async () => {
    stubPhoneViewport();
    const onClose = vi.fn();
    render(
      <ResponsiveDialog open onClose={onClose} title="Review request" actions={<DuncitButton>Deny</DuncitButton>}>
        Request details
      </ResponsiveDialog>,
    );

    await waitFor(() => expect(sheetPaper()).toBeInTheDocument());
    expect(dialogPaper()).toBeNull();
    const heading = screen.getByRole('heading', { name: 'Review request' });
    expect(sheetPaper()).toHaveAttribute('aria-labelledby', heading.id);
    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is always a sheet with bottomSheetOnly, even on a wide screen', () => {
    render(
      <ResponsiveDialog open onClose={vi.fn()} bottomSheetOnly>
        Sheet body
      </ResponsiveDialog>,
    );
    expect(sheetPaper()).toBeInTheDocument();
    expect(sheetPaper()).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
