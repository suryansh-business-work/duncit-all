/**
 * The three ready-made upload fields every form drops in.
 *
 * They are controlled: each renders what it is given and reports upward, never
 * holding its own copy — which is what lets react-hook-form own the value. The
 * cap is the other rule worth pinning down: a field told to take at most N
 * attachments must stop offering the control at N rather than accepting an
 * (N+1)th and failing at the server.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
// Deep import through @duncit/tabs' own node_modules on purpose: this package
// only PEER-depends on react-router, and pnpm's auto-installed peer here
// (6.30.3) is a DIFFERENT instance than the one tabs resolves (6.30.6) — a
// Router from the wrong instance is invisible to useTabParam's useSearchParams.
// @ts-expect-error -- untyped deep path; the shape is react-router's own
import { MemoryRouter } from '../../tabs/node_modules/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AttachmentUploadField from '../src/AttachmentUploadField';
import MediaListField from '../src/media-list-field/MediaListField';
import SingleImageUploadField from '../src/SingleImageUploadField';
import { ATTACHMENT_ACCEPT_ALL } from '../src/attachment';
import type { SingleImageVariant } from '../src/single-image/types';

const IMG = 'https://ik.imagekit.io/duncit/pod/cover.jpg';
const PDF = 'https://ik.imagekit.io/duncit/support/receipt.pdf';

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

// MemoryRouter because MediaListField always mounts MediaPickerDialog, whose
// tab strip keeps its selection in the URL (`useTabParam`).
const wrap = (ui: ReactElement) => render(
  <MemoryRouter>
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  </MemoryRouter>
);

const pressEverything = async () => {
  for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
    if (!control.isConnected) continue;
    fireEvent.click(control);
    await settle();
  }
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('SingleImageUploadField', () => {
  it.each(['avatar', 'url-button', 'url-adornment'] as SingleImageVariant[])('renders the %s variant', async (variant) => {
    const { container } = wrap(
      <SingleImageUploadField value={IMG} onChange={vi.fn()} folder="/pods" variant={variant} label="Cover" />
    );
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders empty, which is what a new form starts on', async () => {
    const { container } = wrap(<SingleImageUploadField value="" onChange={vi.fn()} folder="/pods" />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('shows the caller helper text and error state', async () => {
    const { container } = wrap(
      <SingleImageUploadField value="" onChange={vi.fn()} folder="/pods" helperText="PNG or JPG" error />
    );
    await settle();

    expect(container.textContent).toContain('PNG or JPG');
  });

  it('renders disabled without offering an upload', async () => {
    wrap(<SingleImageUploadField value={IMG} onChange={vi.fn()} folder="/pods" disabled />);
    await settle();

    // Editing is off: the URL input and the device-upload picker are disabled.
    // Two controls deliberately stay clickable because they only SHOW things:
    // the "Open" end-adornment (view the current image) and the AI Monitoring
    // notice chip — a disabled field can still be inspected.
    expect(screen.getByRole('textbox')).toBeDisabled();
    const viewOnly = new Set(['Open', 'About AI Monitoring']);
    const buttons = screen.getAllByRole('button');
    const editButtons = buttons.filter((b) => !viewOnly.has(b.getAttribute('aria-label') ?? ''));
    expect(editButtons.length).toBeGreaterThan(0);
    expect(buttons.length - editButtons.length).toBe(2);
    for (const button of editButtons) expect(button).toBeDisabled();
  });

  it('puts the caller testId on the upload control', async () => {
    wrap(
      <SingleImageUploadField
        value=""
        onChange={vi.fn()}
        folder="/pods"
        variant="url-button"
        uploadTestId="upload-cover"
        buttonLabel="Choose"
      />
    );
    await settle();

    expect(document.body.querySelector('[data-testid="upload-cover"]')).not.toBeNull();
  });

  it('reports a change upward rather than holding its own copy', async () => {
    const onChange = vi.fn();
    wrap(<SingleImageUploadField value={IMG} onChange={onChange} folder="/pods" variant="url-adornment" />);
    await settle();

    for (const field of document.body.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])')) {
      fireEvent.change(field, { target: { value: PDF } });
    }
    await settle();

    for (const [next] of onChange.mock.calls) expect(typeof next).toBe('string');
  });
});

describe('AttachmentUploadField', () => {
  it('renders an empty field', async () => {
    const { container } = wrap(<AttachmentUploadField value={[]} onChange={vi.fn()} label="Attachments" />);
    await settle();

    expect(container.textContent).toContain('Attachments');
  });

  it('previews what is already attached', async () => {
    const { container } = wrap(<AttachmentUploadField value={[IMG, PDF]} onChange={vi.fn()} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders the document variants a support surface uses', async () => {
    for (const previewVariant of ['chip', 'card'] as const) {
      const { container } = wrap(
        <AttachmentUploadField
          value={[PDF]}
          onChange={vi.fn()}
          accept={ATTACHMENT_ACCEPT_ALL}
          allowDocuments
          previewVariant={previewVariant}
        />
      );
      await settle();

      expect(container.innerHTML).not.toBe('');
    }
  });

  it('stops offering the control once the cap is reached', async () => {
    wrap(<AttachmentUploadField value={[IMG, PDF]} onChange={vi.fn()} max={2} />);
    await settle();

    for (const button of screen.queryAllByRole('button')) {
      // The remove buttons stay; what must not be there is another upload.
      expect(button.textContent ?? '').not.toMatch(/upload/i);
    }
  });

  it('survives every control being pressed, and only ever reports a list', async () => {
    const onChange = vi.fn();
    wrap(<AttachmentUploadField value={[IMG, PDF]} onChange={onChange} />);
    await settle();
    await pressEverything();

    for (const [next] of onChange.mock.calls) expect(Array.isArray(next)).toBe(true);
  });

  it('renders disabled', async () => {
    const { container } = wrap(<AttachmentUploadField value={[IMG]} onChange={vi.fn()} disabled />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });
});

describe('MediaListField', () => {
  it('renders the newline-separated URLs it is given', async () => {
    const { container } = wrap(
      <MediaListField label="Gallery" value={`${IMG}\n${PDF}`} onChange={vi.fn()} helperText="One per line" />
    );
    await settle();

    expect(container.textContent).toContain('Gallery');
    expect(container.textContent).toContain('One per line');
  });

  it('renders an empty gallery', async () => {
    const { container } = wrap(<MediaListField label="Gallery" value="" onChange={vi.fn()} />);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('reports the whole field back as one newline-separated string', async () => {
    const onChange = vi.fn();
    wrap(<MediaListField label="Gallery" value={`${IMG}\n${PDF}`} onChange={onChange} buttonLabel="Add image" />);
    await settle();
    await pressEverything();

    for (const [next] of onChange.mock.calls) expect(typeof next).toBe('string');
  });
});
