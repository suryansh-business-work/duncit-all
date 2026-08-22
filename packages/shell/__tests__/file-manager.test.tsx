/**
 * The media library, and the window chrome every floating panel wears.
 *
 * The library's whole reason for existing is "give me the link" — that is what
 * most visits here are for, and making it two clicks deep is what sent people
 * back to hunting in ImageKit's own console. So the copy action is on the tile
 * itself, and it hands back the file rather than a name.
 *
 * The other rule is who may change things. Reading is anyone; renaming,
 * re-tagging and deleting belong to the roles the server guards, and a reader
 * must not be shown a control that will be refused. `canWrite` is that line and
 * these hold both sides of it.
 */
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';
import FileCard from '../src/file-manager/FileCard';
import FileDetailsView from '../src/file-manager/FileDetailsView';
import FileInfoPanel from '../src/file-manager/FileInfoPanel';
import FileManagerToolbar from '../src/file-manager/FileManagerToolbar';
import { FileManagerDialog } from '../src/file-manager';
import { TitleBar, ResizeGrip } from '../src/floating-window/WindowChrome';
import type { MediaItem } from '../src/file-manager/queries';

const testTheme = createTheme();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => undefined;
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const file = (over: Partial<MediaItem> = {}): MediaItem => ({
  fileId: 'f-1',
  name: 'court.png',
  filePath: '/uploads/court.png',
  url: 'https://ik.imagekit.io/duncit/court.png',
  thumbnail: 'https://ik.imagekit.io/duncit/tr:w-200/court.png',
  type: 'file',
  fileType: 'image',
  mime: 'image/png',
  size: 240_000,
  width: 1600,
  height: 900,
  tags: ['venue', 'court'],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-02T10:00:00.000Z',
  versionId: 'v-1',
  ...over,
});

const PDF = file({
  fileId: 'f-2',
  name: 'roster.pdf',
  fileType: 'non-image',
  mime: 'application/pdf',
  thumbnail: null,
  width: null,
  height: null,
  tags: [],
});

const wrap = (ui: React.ReactNode) =>
  render(
    <MockedProvider link={schemaMockLink()}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('FileCard', () => {
  const card = (over: Partial<Parameters<typeof FileCard>[0]> = {}) => {
    const spies = { onToggle: vi.fn(), onOpen: vi.fn(), onCopy: vi.fn() };
    return {
      spies,
      ...wrap(<FileCard file={file()} selected={false} {...spies} {...over} />),
    };
  };

  it('shows the file by name', () => {
    expect(card().container.textContent).toContain('court.png');
  });

  it('shows a thumbnail for an image and an icon for anything else', () => {
    expect(card().container.querySelector('img')).not.toBeNull();
    expect(card({ file: PDF }).container.querySelector('img')).toBeNull();
  });

  it('hands the whole file back when the link is copied, not just its name', () => {
    const { container, spies } = card();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [copied] of spies.onCopy.mock.calls) {
      expect(copied).toHaveProperty('url', 'https://ik.imagekit.io/duncit/court.png');
    }
  });

  it('ticks and unticks by file id', () => {
    const { container, spies } = card({ selected: true });
    const box = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

    fireEvent.click(box);

    expect(spies.onToggle).toHaveBeenCalledWith('f-1');
  });
});

describe('FileInfoPanel', () => {
  it('states the size, the dimensions and the tags a file carries', () => {
    const { container } = wrap(<FileInfoPanel file={file()} />);

    expect(container.textContent).toContain('court.png');
    expect(container.textContent).toContain('venue');
  });

  it('renders a file with no dimensions and no tags at all', () => {
    const { container } = wrap(<FileInfoPanel file={PDF} />);

    expect(container.textContent).toContain('roster.pdf');
  });
});

describe('FileDetailsView', () => {
  const details = (over: Partial<Parameters<typeof FileDetailsView>[0]> = {}) => {
    const spies = {
      onBack: vi.fn(),
      onCopy: vi.fn(),
      onDelete: vi.fn(),
      onChanged: vi.fn(),
      onError: vi.fn(),
      onNavigate: vi.fn(),
    };
    return {
      spies,
      ...wrap(<FileDetailsView file={file()} canWrite {...spies} {...over} />),
    };
  };

  it('opens on the file it was given', async () => {
    const { container } = details();
    await settle();

    expect(container.textContent).toContain('court.png');
  });

  it('offers no way to rename or re-tag a reader', async () => {
    const reader = details({ canWrite: false });
    await settle();
    const readerControls = reader.container.querySelectorAll('button').length;

    const writer = details({ canWrite: true });
    await settle();

    expect(writer.container.querySelectorAll('button').length).toBeGreaterThan(readerControls);
  });

  it('steps through the ticked files in grid order rather than back and forth', async () => {
    const siblings = [file(), PDF, file({ fileId: 'f-3', name: 'net.png' })];
    const { container, spies } = details({ siblings });
    await settle();

    for (const control of [...container.querySelectorAll<HTMLElement>('button')].slice(0, 12)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    const ids = new Set(siblings.map((item) => item.fileId));
    for (const [next] of spies.onNavigate.mock.calls) {
      expect(ids.has((next as MediaItem).fileId)).toBe(true);
    }
  });

  it('copies the URL itself, which is what the panel is open for', async () => {
    const { container, spies } = details();
    await settle();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
      await settle();
    }

    for (const [url] of spies.onCopy.mock.calls) {
      expect(String(url)).toContain('https://');
    }
  });

  it('survives text being typed into every field it offers', async () => {
    const { container } = details();
    await settle();

    for (const field of container.querySelectorAll<HTMLInputElement>('input:not([type="checkbox"])')) {
      fireEvent.change(field, { target: { value: 'renamed' } });
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });
});

describe('FileManagerToolbar', () => {
  const toolbar = (over: Partial<Parameters<typeof FileManagerToolbar>[0]> = {}) => {
    const spies = {
      onSearch: vi.fn(),
      onFileType: vi.fn(),
      onSort: vi.fn(),
      onUpload: vi.fn(),
      onDeleteSelected: vi.fn(),
      onRefresh: vi.fn(),
    };
    return {
      spies,
      ...wrap(
        <FileManagerToolbar
          search=""
          fileType=""
          sort=""
          selectedCount={0}
          canWrite
          uploading={false}
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('reports what was searched for', () => {
    const { container, spies } = toolbar();
    const field = container.querySelector('input') as HTMLInputElement;

    fireEvent.change(field, { target: { value: 'court' } });

    expect(spies.onSearch).toHaveBeenCalledWith('court');
  });

  it('offers no upload and no delete to a reader', () => {
    const reader = toolbar({ canWrite: false });
    const writer = toolbar({ canWrite: true, selectedCount: 2 });

    expect(writer.container.querySelectorAll('button').length).toBeGreaterThan(
      reader.container.querySelectorAll('button').length
    );
  });

  it('renders while an upload is in flight', () => {
    expect(toolbar({ uploading: true }).container.innerHTML).not.toBe('');
  });

  it('survives every control being pressed', () => {
    const { container } = toolbar({ selectedCount: 3 });

    for (const control of container.querySelectorAll<HTMLElement>('button:not([disabled])')) {
      if (control.isConnected) fireEvent.click(control);
    }

    expect(container.innerHTML).not.toBe('');
  });
});

describe('FileManagerDialog', () => {
  it('renders nothing while it is closed', () => {
    wrap(<FileManagerDialog open={false} onClose={vi.fn()} roles={['SUPER_ADMIN']} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the library for someone who may change it', async () => {
    wrap(<FileManagerDialog open onClose={vi.fn()} roles={['SUPER_ADMIN']} />);
    await settle();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('opens read-only for someone who may not, and for someone with no roles', async () => {
    wrap(<FileManagerDialog open onClose={vi.fn()} roles={['SUPPORT_USER']} />);
    await settle();
    expect(document.body.innerHTML).not.toBe('');

    wrap(<FileManagerDialog open onClose={vi.fn()} roles={undefined} />);
    await settle();
    expect(document.body.innerHTML).not.toBe('');
  });
});

describe('WindowChrome', () => {
  const bar = (over: Partial<Parameters<typeof TitleBar>[0]> = {}) => {
    const spies = {
      onMinimise: vi.fn(),
      onToggleMaximise: vi.fn(),
      onClose: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    };
    return {
      spies,
      ...wrap(<TitleBar title="Staff chat" maximised={false} {...spies} {...over} />),
    };
  };

  it('shows the title, and a subtitle only when there is one', () => {
    expect(bar().container.textContent).toContain('Staff chat');
    expect(bar({ subtitle: 'Vikram N' }).container.textContent).toContain('Vikram N');
  });

  it('offers minimise, maximise and close, and reports each to the caller', () => {
    const { container, spies } = bar();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    const pressed =
      spies.onMinimise.mock.calls.length +
      spies.onToggleMaximise.mock.calls.length +
      spies.onClose.mock.calls.length;
    expect(pressed).toBe(3);
  });

  it('shows restore rather than maximise once the window is already maximised', () => {
    expect(bar({ maximised: true }).container.innerHTML).not.toBe('');
  });

  it('drags from the TITLE, never from the buttons beside it', () => {
    const { container, spies } = bar();
    const title = container.firstElementChild?.firstElementChild as HTMLElement;

    fireEvent.pointerDown(title);
    fireEvent.pointerMove(title);
    fireEvent.pointerUp(title);
    expect(spies.onPointerDown).toHaveBeenCalled();

    // The handle used to be the whole bar, so a pointerdown on close began a
    // drag — and a drag takes pointer capture, so the button never saw the
    // pointerup that would have become its click. All three did nothing.
    spies.onPointerDown.mockClear();
    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.pointerDown(control);
    }
    expect(spies.onPointerDown).not.toHaveBeenCalled();
  });

  it('resizes from the grip in the corner', () => {
    const spies = { onPointerDown: vi.fn(), onPointerMove: vi.fn(), onPointerUp: vi.fn() };
    const { container } = wrap(<ResizeGrip {...spies} />);
    const grip = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(grip);
    fireEvent.pointerMove(grip);
    fireEvent.pointerUp(grip);

    expect(spies.onPointerDown).toHaveBeenCalled();
  });
});
