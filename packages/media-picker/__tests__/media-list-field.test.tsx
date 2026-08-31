/**
 * The media list field: a newline-separated URL string edited as rows.
 *
 * It holds no state of its own — every add, replace, reorder and remove goes
 * back out as the whole string, which is what lets react-hook-form own the
 * value. The two rules worth pinning down are that a row knows a video from a
 * picture by its own URL, and that reordering at either end is a no-op rather
 * than a wrap-around.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
// Deep import through @duncit/tabs' own node_modules on purpose: this package
// only PEER-depends on react-router-dom, and pnpm's auto-installed peer here is
// a DIFFERENT instance than the one tabs resolves — a Router from the wrong
// instance is invisible to useTabParam's useSearchParams.
// @ts-expect-error -- untyped deep path; the shape is react-router-dom's own
import { MemoryRouter } from '../../tabs/node_modules/react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MediaListField from '../src/media-list-field/MediaListField';
import MediaListRow from '../src/media-list-field/MediaListRow';

const A = 'https://ik.imagekit.io/duncit/pods/a.jpg';
const B = 'https://ik.imagekit.io/duncit/pods/b.jpg';
const C = 'https://ik.imagekit.io/duncit/pods/c.jpg';
const CLIP = 'https://ik.imagekit.io/duncit/pods/reel.mp4';

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter>
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
        <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
      </MockedProvider>
    </MemoryRouter>
  );

/** The four icon buttons a row renders, in order: replace, up, down, remove. */
const rowControls = (index: number): HTMLElement[] => {
  let node = document.body.querySelectorAll('img, video')[index]?.parentElement ?? null;
  while (node && node.querySelectorAll('button').length < 4) node = node.parentElement;
  return [...(node?.querySelectorAll('button') ?? [])];
};

const field = (value: string, onChange = vi.fn(), extra: Record<string, unknown> = {}) => {
  const view = wrap(
    <MediaListField label="Gallery" value={value} onChange={onChange} folder="/pods" {...extra} />
  );
  return { ...view, onChange };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('MediaListField', () => {
  it('lists one row per URL, ignoring the blanks a trailing newline leaves', async () => {
    const { container } = field(`${A}\n\n  ${B}  \n`);
    await settle();

    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('invites the reader to add the first one on an empty field', async () => {
    field('');
    await settle();

    expect(screen.getByText(/No images yet/)).toBeInTheDocument();
  });

  it('renders the caller helper text', async () => {
    field(A, vi.fn(), { helperText: 'The first one is the cover' });
    await settle();

    expect(screen.getByText('The first one is the cover')).toBeInTheDocument();
  });

  it('takes the caller button wording over the shared one', async () => {
    field('', vi.fn(), { buttonLabel: 'Attach a photo' });
    await settle();

    expect(screen.getByRole('button', { name: 'Attach a photo' })).toBeInTheDocument();
  });

  it('moves a row down and reports the whole list back', async () => {
    const { onChange } = field([A, B, C].join('\n'));
    await settle();

    fireEvent.click(rowControls(0)[2]);

    expect(onChange).toHaveBeenCalledWith([B, A, C].join('\n'));
  });

  it('moves a row up and reports the whole list back', async () => {
    const { onChange } = field([A, B, C].join('\n'));
    await settle();

    fireEvent.click(rowControls(2)[1]);

    expect(onChange).toHaveBeenCalledWith([A, C, B].join('\n'));
  });

  // Off either end is a no-op, never a wrap-around.
  it('does nothing when a row is moved past either end', async () => {
    const { onChange } = field([A, B].join('\n'));
    await settle();

    fireEvent.click(rowControls(0)[1]);
    fireEvent.click(rowControls(1)[2]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a row and reports what is left', async () => {
    const { onChange } = field([A, B, C].join('\n'));
    await settle();

    fireEvent.click(rowControls(1)[3]);

    expect(onChange).toHaveBeenCalledWith([A, C].join('\n'));
  });

  it('opens the picker to add, and closes it again without changing anything', async () => {
    const { onChange } = field(A);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: /Add image/ }));
    await settle();
    expect(screen.getByText('Add to Gallery')).toBeInTheDocument();

    fireEvent.keyDown(document.body.querySelector('[role="dialog"]') as HTMLElement, {
      key: 'Escape',
    });
    await settle();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens the picker on the row being replaced, named for it', async () => {
    field([A, B].join('\n'));
    await settle();

    fireEvent.click(rowControls(1)[0]);
    await settle();

    expect(screen.getByText('Replace image in Gallery')).toBeInTheDocument();
  });
});

describe('MediaListRow', () => {
  const row = (url: string, over: Record<string, unknown> = {}) =>
    wrap(
      <MediaListRow
        url={url}
        index={0}
        total={2}
        onReplace={vi.fn()}
        onMove={vi.fn()}
        onRemove={vi.fn()}
        {...over}
      />
    );

  it('plays a clip inline rather than showing it as a broken picture', () => {
    const { container } = row(CLIP);

    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('recognises a clip that carries a query string', () => {
    const { container } = row(`${CLIP}?tr=orig-true`);

    expect(container.querySelector('video')).not.toBeNull();
  });

  it('renders a picture as a picture', () => {
    const { container } = row(A);

    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('video')).toBeNull();
  });

  it('reports each control to the caller', () => {
    const onReplace = vi.fn();
    const onMove = vi.fn();
    const onRemove = vi.fn();
    row(A, { index: 1, total: 3, onReplace, onMove, onRemove });

    const [replace, up, down, remove] = screen.getAllByRole('button');
    fireEvent.click(replace);
    fireEvent.click(up);
    fireEvent.click(down);
    fireEvent.click(remove);

    expect(onReplace).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenNthCalledWith(1, -1);
    expect(onMove).toHaveBeenNthCalledWith(2, 1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
