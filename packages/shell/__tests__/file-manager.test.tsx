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
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { schemaMockLink } from './schema-mock';
import FileCard from '../src/file-manager/FileCard';
import FileDetailsView, { describeSaveError } from '../src/file-manager/FileDetailsView';
import FileInfoPanel from '../src/file-manager/FileInfoPanel';
import FileManagerToolbar from '../src/file-manager/FileManagerToolbar';
import { FileManagerDialog } from '../src/file-manager';
import {
  DELETE_MEDIA_FILES,
  MEDIA_FILES,
  PAGE_SIZE,
  RENAME_MEDIA_FILE,
  UPDATE_MEDIA_FILE,
  type MediaItem,
} from '../src/file-manager/queries';
import { downloadUrl, thumbUrl } from '../src/file-manager/transform';
import { TitleBar, ResizeGrip } from '../src/floating-window/WindowChrome';

const testTheme = createTheme();

const uploadMock = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload: uploadMock, uploading: false }),
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => undefined;
});

beforeEach(() => {
  uploadMock.mockClear();
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async () => undefined) },
  });
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

  it('names a non-image file generically when ImageKit reports no mime type for it', () => {
    const { container } = card({ file: file({ fileType: 'non-image', mime: null }) });

    expect(container.textContent).toContain('file');
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

  it('falls back to the raw type and a placeholder version when ImageKit reports neither', () => {
    const bare = file({ fileType: null, mime: null, versionId: null, type: 'file' });
    const { container } = wrap(<FileInfoPanel file={bare} />);

    expect(container.textContent).toContain('file');
    expect(container.textContent).toContain('—');
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

describe('FileDetailsView saving', () => {
  const openEdit = (mocks: readonly MockedResponse[], props: Record<string, unknown> = {}) => {
    const spies = {
      onBack: vi.fn(),
      onCopy: vi.fn(),
      onDelete: vi.fn(),
      onChanged: vi.fn(),
      onError: vi.fn(),
    };
    const view = render(
      <MockedProvider mocks={[...mocks]}>
        <ThemeProvider theme={testTheme}>
          <MemoryRouter>
            <FileDetailsView file={file()} canWrite {...spies} {...props} />
          </MemoryRouter>
        </ThemeProvider>
      </MockedProvider>
    );
    fireEvent.click(view.container.querySelectorAll('[role="tab"]')[1]);
    return { spies, ...view };
  };

  const clickSave = (container: HTMLElement, which: 'name' | 'tags') => {
    const buttons = [...container.querySelectorAll('button')].filter((b) => b.textContent === 'Save');
    fireEvent.click(buttons[which === 'name' ? 0 : 1]);
  };

  it('does nothing when the name field is saved unchanged', async () => {
    const { container, spies } = openEdit([]);

    clickSave(container, 'name');
    await settle();

    expect(spies.onChanged).not.toHaveBeenCalled();
  });

  it('does nothing when the name field is cleared to blank', async () => {
    const { container, spies } = openEdit([]);
    const nameField = container.querySelector('input[value="court.png"]') as HTMLInputElement;
    fireEvent.change(nameField, { target: { value: '   ' } });

    clickSave(container, 'name');
    await settle();

    expect(spies.onChanged).not.toHaveBeenCalled();
  });

  it('renames the file and hands the updated record back', async () => {
    const updated = file({ name: 'renamed.png' });
    const mocks: MockedResponse[] = [
      {
        request: {
          query: RENAME_MEDIA_FILE,
          variables: { fileId: 'f-1', newFileName: 'renamed.png', purgeCache: true },
        },
        result: { data: { renameMediaFile: updated } },
      },
    ];
    const { container, spies } = openEdit(mocks);
    const nameField = container.querySelector('input[value="court.png"]') as HTMLInputElement;
    fireEvent.change(nameField, { target: { value: 'renamed.png' } });

    clickSave(container, 'name');
    await settle();

    expect(spies.onChanged).toHaveBeenCalledWith(updated);
  });

  it('reports a rename that fails', async () => {
    const mocks: MockedResponse[] = [
      {
        request: {
          query: RENAME_MEDIA_FILE,
          variables: { fileId: 'f-1', newFileName: 'taken.png', purgeCache: true },
        },
        error: new Error('That name is already in use'),
      },
    ];
    const { container, spies } = openEdit(mocks);
    const nameField = container.querySelector('input[value="court.png"]') as HTMLInputElement;
    fireEvent.change(nameField, { target: { value: 'taken.png' } });

    clickSave(container, 'name');
    await settle();

    expect(spies.onError).toHaveBeenCalledWith(expect.stringContaining('already in use'));
  });

  it('saves the tags as they stand', async () => {
    const updated = file({ tags: ['venue', 'court'] });
    const mocks: MockedResponse[] = [
      {
        request: { query: UPDATE_MEDIA_FILE, variables: { fileId: 'f-1', tags: ['venue', 'court'] } },
        result: { data: { updateMediaFile: updated } },
      },
    ];
    const { container, spies } = openEdit(mocks);

    clickSave(container, 'tags');
    await settle();

    expect(spies.onChanged).toHaveBeenCalledWith(updated);
  });

  it('reports a tag save that fails', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: UPDATE_MEDIA_FILE, variables: { fileId: 'f-1', tags: ['venue', 'court'] } },
        error: new Error('offline'),
      },
    ];
    const { container, spies } = openEdit(mocks);

    clickSave(container, 'tags');
    await settle();

    expect(spies.onError).toHaveBeenCalledWith(expect.stringContaining('offline'));
  });

  it('adds a free-typed tag through the autocomplete', () => {
    const { container } = openEdit([]);
    const tagsInput = container.querySelector('.MuiAutocomplete-root input') as HTMLInputElement;

    fireEvent.change(tagsInput, { target: { value: 'new-tag' } });
    fireEvent.keyDown(tagsInput, { key: 'Enter', code: 'Enter' });

    expect(container.textContent).toContain('new-tag');
  });
});

describe('describeSaveError', () => {
  it('reads the message off a real Error', () => {
    expect(describeSaveError(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('falls back when whatever was thrown is not an Error', () => {
    expect(describeSaveError('a string was thrown', 'fallback')).toBe('fallback');
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

  it('hands the picked files to the caller once the hidden input reports them', () => {
    const { container, spies } = toolbar();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const picked = new File(['x'], 'court.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [picked] });

    fireEvent.change(input);

    expect(spies.onUpload).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the file picker is dismissed with nothing chosen', () => {
    const { container, spies } = toolbar();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [] });

    fireEvent.change(input);

    expect(spies.onUpload).not.toHaveBeenCalled();
  });

  it('changes the file type through its dropdown', () => {
    const { container, spies } = toolbar();
    const [typeSelect] = container.querySelectorAll('[role="combobox"]');
    fireEvent.mouseDown(typeSelect);
    const option = [...document.body.querySelectorAll('[role="option"]')].find((o) => o.textContent === 'Images');

    fireEvent.click(option as HTMLElement);

    expect(spies.onFileType).toHaveBeenCalledWith('image');
  });

  it('changes the sort order through its dropdown', () => {
    const { container, spies } = toolbar();
    const combos = container.querySelectorAll('[role="combobox"]');
    fireEvent.mouseDown(combos[1]);
    const option = [...document.body.querySelectorAll('[role="option"]')].find((o) => o.textContent === 'Oldest first');

    fireEvent.click(option as HTMLElement);

    expect(spies.onSort).toHaveBeenCalledWith('ASC_CREATED');
  });
});

describe('transform', () => {
  it('appends the first query parameter with a question mark', () => {
    expect(thumbUrl('https://ik.imagekit.io/duncit/court.png', 200)).toBe(
      'https://ik.imagekit.io/duncit/court.png?tr=w-200,h-200,c-maintain_ratio'
    );
    expect(downloadUrl('https://ik.imagekit.io/duncit/court.png')).toBe(
      'https://ik.imagekit.io/duncit/court.png?ik-attachment=true'
    );
  });

  it('joins onto an existing query string with an ampersand instead', () => {
    expect(thumbUrl('https://ik.imagekit.io/duncit/court.png?v=2')).toBe(
      'https://ik.imagekit.io/duncit/court.png?v=2&tr=w-240,h-240,c-maintain_ratio'
    );
    expect(downloadUrl('https://ik.imagekit.io/duncit/court.png?v=2')).toBe(
      'https://ik.imagekit.io/duncit/court.png?v=2&ik-attachment=true'
    );
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

describe('FileManagerDialog interactions', () => {
  const BASE_VARS = { search: null, fileType: null, skip: 0, limit: PAGE_SIZE, sort: 'DESC_CREATED' };

  const filesMock = (
    items: MediaItem[],
    overrideVars: Record<string, unknown> = {},
    over: Partial<MockedResponse> = {}
  ): MockedResponse =>
    ({
      request: { query: MEDIA_FILES, variables: { ...BASE_VARS, ...overrideVars } },
      result: { data: { mediaFiles: items } },
      maxUsageCount: Number.POSITIVE_INFINITY,
      ...over,
    }) as MockedResponse;

  const wrapMocked = (ui: React.ReactNode, mocks: readonly MockedResponse[]) =>
    render(
      <MockedProvider mocks={[...mocks]}>
        <ThemeProvider theme={testTheme}>
          <MemoryRouter>{ui}</MemoryRouter>
        </ThemeProvider>
      </MockedProvider>
    );

  const dialog = (mocks: readonly MockedResponse[]) =>
    wrapMocked(<FileManagerDialog open onClose={vi.fn()} roles={['SUPER_ADMIN']} />, mocks);

  it('shows the error banner when the list fails to load', async () => {
    const mocks = [filesMock([], {}, { result: undefined, error: new Error('ImageKit is down') })];
    dialog(mocks);
    await settle();
    await settle();

    expect(document.body.textContent).toContain('ImageKit is down');
  });

  it('says nothing matches once a search is typed in, without waiting for the debounce', async () => {
    dialog([filesMock([])]);
    await settle();
    await settle();

    fireEvent.change(document.body.querySelector('input') as HTMLInputElement, { target: { value: 'zzz' } });

    expect(document.body.textContent).toContain('zzz');
  });

  it('copies a link and reports success through a toast', async () => {
    dialog([filesMock([file()])]);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('[aria-label="Copy link to court.png"]') as HTMLElement);
    await settle();

    expect(document.body.textContent).toContain('Link copied');
  });

  it('reports a copy that fails', async () => {
    (globalThis.navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Clipboard blocked')
    );
    dialog([filesMock([file()])]);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('[aria-label="Copy link to court.png"]') as HTMLElement);
    await settle();

    expect(document.body.textContent).toContain('Clipboard blocked');
  });

  it('deletes the selected files and reports how many', async () => {
    const mocks = [
      filesMock([file(), file({ fileId: 'f-2', name: 'net.png' })]),
      { request: { query: DELETE_MEDIA_FILES, variables: { fileIds: ['f-1'] } }, result: { data: { deleteMediaFiles: 1 } } },
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('input[type="checkbox"]') as HTMLElement);
    const deleteButton = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Delete '));
    fireEvent.click(deleteButton as HTMLElement);
    await settle();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Deleted 1 file');
  });

  it('ticks and unticks a file for bulk selection', async () => {
    dialog([filesMock([file()])]);
    await settle();
    await settle();

    const checkbox = document.body.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect([...document.body.querySelectorAll('button')].some((b) => b.textContent?.startsWith('Delete '))).toBe(true);

    fireEvent.click(checkbox);
    expect([...document.body.querySelectorAll('button')].some((b) => b.textContent?.startsWith('Delete '))).toBe(false);
  });

  it('reports zero deleted with the plural wording, when nothing came back at all', async () => {
    const mocks = [
      filesMock([file()]),
      { request: { query: DELETE_MEDIA_FILES, variables: { fileIds: ['f-1'] } }, result: { data: { deleteMediaFiles: null } } },
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('input[type="checkbox"]') as HTMLElement);
    const deleteButton = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Delete '));
    fireEvent.click(deleteButton as HTMLElement);
    await settle();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Deleted 0 files');
  });

  it('reports a bulk delete that fails', async () => {
    const mocks = [
      filesMock([file()]),
      { request: { query: DELETE_MEDIA_FILES, variables: { fileIds: ['f-1'] } }, error: new Error('offline') },
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('input[type="checkbox"]') as HTMLElement);
    const deleteButton = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Delete '));
    fireEvent.click(deleteButton as HTMLElement);
    await settle();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('offline');
  });

  it('deletes a single file from its details panel', async () => {
    const mocks = [
      filesMock([file()]),
      { request: { query: DELETE_MEDIA_FILES, variables: { fileIds: ['f-1'] } }, result: { data: { deleteMediaFiles: 1 } } },
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('.MuiCardActionArea-root') as HTMLElement);
    await settle();
    const deleteButton = [...document.body.querySelectorAll('button')].find((b) => b.textContent === 'Delete');
    fireEvent.click(deleteButton as HTMLElement);
    await settle();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Deleted court.png');
  });

  it('says nothing was deleted when the record was already gone', async () => {
    const mocks = [
      filesMock([file()]),
      { request: { query: DELETE_MEDIA_FILES, variables: { fileIds: ['f-1'] } }, result: { data: { deleteMediaFiles: null } } },
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('.MuiCardActionArea-root') as HTMLElement);
    await settle();
    const deleteButton = [...document.body.querySelectorAll('button')].find((b) => b.textContent === 'Delete');
    fireEvent.click(deleteButton as HTMLElement);
    // Two network hops behind manager.removeOne (the mutation, then its own
    // refetch) before index.tsx's .then() can toast — one settle lands mid-chain.
    await settle();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('Nothing was deleted');
  });

  it('reports a single-file delete that fails', async () => {
    const mocks = [
      filesMock([file()]),
      { request: { query: DELETE_MEDIA_FILES, variables: { fileIds: ['f-1'] } }, error: new Error('locked') },
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('.MuiCardActionArea-root') as HTMLElement);
    await settle();
    const deleteButton = [...document.body.querySelectorAll('button')].find((b) => b.textContent === 'Delete');
    fireEvent.click(deleteButton as HTMLElement);
    await settle();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('locked');
  });

  it('uploads files and reports how many', async () => {
    dialog([filesMock([])]);
    await settle();
    await settle();

    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const picked = new File(['x'], 'court.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [picked] });
    fireEvent.change(input);
    await settle();
    await settle();
    await settle();

    expect(uploadMock).toHaveBeenCalled();
    expect(document.body.textContent).toContain('Uploaded 1 file');
  });

  it('uploads more than one file with the plural wording', async () => {
    dialog([filesMock([])]);
    await settle();
    await settle();

    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const picked = [
      new File(['x'], 'court.png', { type: 'image/png' }),
      new File(['y'], 'net.png', { type: 'image/png' }),
    ];
    Object.defineProperty(input, 'files', { configurable: true, value: picked });
    fireEvent.change(input);
    await settle();
    await settle();
    await settle();

    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain('Uploaded 2 files');
  });

  it('reports an upload that fails', async () => {
    uploadMock.mockRejectedValueOnce(new Error('too large'));
    dialog([filesMock([])]);
    await settle();
    await settle();

    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const picked = new File(['x'], 'court.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [picked] });
    fireEvent.change(input);
    await settle();
    await settle();
    await settle();

    expect(document.body.textContent).toContain('too large');
  });

  it('refreshes the list from the toolbar without throwing', async () => {
    dialog([filesMock([file()])]);
    await settle();
    await settle();

    const refreshButton = document.body.querySelector('[aria-label="Reload files"]') as HTMLElement;
    expect(() => fireEvent.click(refreshButton)).not.toThrow();
    await settle();

    expect(document.body.textContent).toContain('court.png');
  });

  it('pages forward and back through the results', async () => {
    const pageOne = Array.from({ length: PAGE_SIZE }, (_, i) => file({ fileId: `f-${i}`, name: `file-${i}.png` }));
    const mocks = [filesMock(pageOne), filesMock([file({ fileId: 'f-40', name: 'file-40.png' })], { skip: PAGE_SIZE })];
    dialog(mocks);
    await settle();
    await settle();

    const [prevButton, nextButton] = [...document.body.querySelectorAll('button')].filter(
      (b) => b.textContent === 'Previous' || b.textContent === 'Next'
    );
    expect(prevButton).toBeDisabled();

    fireEvent.click(nextButton);
    await settle();
    await settle();

    expect(document.body.textContent).toContain('file-40.png');
    expect(prevButton).not.toBeDisabled();

    fireEvent.click(prevButton);
    await settle();
    await settle();

    expect(document.body.textContent).toContain('file-0.png');
  });

  it('closes the details panel through its own close button', async () => {
    dialog([filesMock([file()])]);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('.MuiCardActionArea-root') as HTMLElement);
    await settle();
    expect(document.body.querySelector('[aria-label="Close file details"]')).not.toBeNull();

    fireEvent.click(document.body.querySelector('[aria-label="Close file details"]') as HTMLElement);
    await settle();

    expect(document.body.querySelector('[aria-label="Close file details"]')).toBeNull();
  });

  it('saves a rename from inside the dialog and toasts that it was saved', async () => {
    const updated = file({ name: 'renamed.png' });
    const mocks = [
      filesMock([file()]),
      {
        request: {
          query: RENAME_MEDIA_FILE,
          variables: { fileId: 'f-1', newFileName: 'renamed.png', purgeCache: true },
        },
        result: { data: { renameMediaFile: updated } },
      } as MockedResponse,
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('.MuiCardActionArea-root') as HTMLElement);
    await settle();
    fireEvent.click(document.body.querySelectorAll('[role="tab"]')[1]);
    const nameField = document.body.querySelector('input[value="court.png"]') as HTMLInputElement;
    fireEvent.change(nameField, { target: { value: 'renamed.png' } });
    const saveButtons = [...document.body.querySelectorAll('button')].filter((b) => b.textContent === 'Save');
    fireEvent.click(saveButtons[0]);
    await settle();

    expect(document.body.textContent).toContain('Saved');
  });

  it('reports a rename failure from inside the dialog', async () => {
    const mocks = [
      filesMock([file()]),
      {
        request: {
          query: RENAME_MEDIA_FILE,
          variables: { fileId: 'f-1', newFileName: 'taken.png', purgeCache: true },
        },
        error: new Error('That name is taken'),
      } as MockedResponse,
    ];
    dialog(mocks);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('.MuiCardActionArea-root') as HTMLElement);
    await settle();
    fireEvent.click(document.body.querySelectorAll('[role="tab"]')[1]);
    const nameField = document.body.querySelector('input[value="court.png"]') as HTMLInputElement;
    fireEvent.change(nameField, { target: { value: 'taken.png' } });
    const saveButtons = [...document.body.querySelectorAll('button')].filter((b) => b.textContent === 'Save');
    fireEvent.click(saveButtons[0]);
    await settle();

    expect(document.body.textContent).toContain('That name is taken');
  });

  it('dismisses the toast through its own close button', async () => {
    dialog([filesMock([file()])]);
    await settle();
    await settle();

    fireEvent.click(document.body.querySelector('[aria-label="Copy link to court.png"]') as HTMLElement);
    await settle();
    expect(document.body.querySelector('[role="alert"]')).not.toBeNull();

    const alert = document.body.querySelector('[role="alert"]') as HTMLElement;
    fireEvent.click(alert.querySelector('button') as HTMLElement);
    // The Alert plays a real exit transition (Grow/Fade) before unmounting —
    // its own JS timeout fallback needs actual wall-clock time, not a
    // zero-delay settle, since jsdom never fires transitionend.
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 400);
      });
    });

    expect(document.body.querySelector('[role="alert"]')).toBeNull();
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
