import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import type { IntelMedia } from '@duncit/gql-types';
import { INTEL_CREATE_FOLDER } from '../../src/graphql/media';
import { fileObjectUrl, RestError, transcribeAudio, uploadFile } from '../../src/lib/rest';
import FileDetailDialog from '../../src/pages/media/FileDetailDialog';
import MediaSidebar from '../../src/pages/media/MediaSidebar';
import { useUploads } from '../../src/pages/media/useUploads';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('../../src/pages/media/FilePreview', () => ({ default: ({ name }: { name: string }) => <div>preview:{name}</div> }));

beforeEach(() => {
  boot.value = bootstrap({}, { user_id: 'owner-1' });
  localStorage.setItem('intel_token', 'tok');
});
afterEach(() => vi.unstubAllGlobals());

const file = (over: Partial<IntelMedia> = {}): IntelMedia => ({
  __typename: 'IntelMedia', id: 'f1', owner_id: 'owner-1', name: 'Q3.pdf', folder: '/Reports', mime: 'application/pdf', size: 2048, visibility: 'PRIVATE', favorite: false, archived: false, deleted: false,
  index_status: 'FAILED', index_method: 'PDF', index_warning: 'This PDF has no text layer', page_count: 0, chunk_count: 0, indexed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...over,
});

describe('REST helpers', () => {
  it('sends the bearer token and reports the server’s message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ text: 'hello there' }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(transcribeAudio(new Blob(['x'], { type: 'audio/webm' }))).resolves.toBe('hello there');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok', 'Content-Type': 'audio/webm' } });
    await expect(fileObjectUrl('f1')).rejects.toEqual(new RestError('NOT_FOUND', 404));
  });

  it('uploads with progress and rejects with the server message', async () => {
    class FakeXhr {
      upload = { onprogress: null as null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) };
      status = 0;
      responseText = '';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      onabort: null | (() => void) = null;
      open = vi.fn();
      setRequestHeader = vi.fn();
      abort = vi.fn(() => this.onabort?.());
      send = vi.fn(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
        this.status = 415;
        this.responseText = '{"error":"This file type is not allowed."}';
        this.onload?.();
      });
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const progress = vi.fn();
    const { promise } = uploadFile(new File(['x'], 'a.exe'), { folder: '/', visibility: 'PRIVATE' }, progress);
    await expect(promise).rejects.toThrow('This file type is not allowed.');
    expect(progress).toHaveBeenCalledWith(50);
  });
});

describe('useUploads', () => {
  it('refuses wrong types and oversize files up front, using the limits from settings', () => {
    const { result } = renderHook(() => useUploads({ folder: '/', visibility: 'PRIVATE', maxMb: 1, types: ['application/pdf'], onUploaded: vi.fn() }));
    act(() => result.current.add([new File(['x'], 'virus.exe', { type: 'application/x-msdownload' }), new File([new Uint8Array(2 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })]));
    expect(result.current.items.map((i) => [i.name, i.status, i.error])).toEqual([
      ['virus.exe', 'failed', 'intel.media.typeRefused'],
      ['big.pdf', 'failed', 'intel.media.tooLarge:1'],
    ]);
    act(() => result.current.clearFinished());
    expect(result.current.items).toEqual([]);
  });
});

describe('MediaSidebar', () => {
  it('creates a folder under the current one, refusing invalid names', async () => {
    const create = { request: { query: INTEL_CREATE_FOLDER, variables: { path: '/Reports/2026' } }, result: { data: { intelCreateFolder: '/Reports/2026' } } };
    const onFolder = vi.fn();
    renderWithProviders(<MediaSidebar view="ALL" folder="/Reports" folders={['/', '/Reports']} onView={vi.fn()} onFolder={onFolder} onFolderCreated={vi.fn()} />, { mocks: [create] });
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.newFolder' }));
    const name = screen.getByLabelText('intel.media.newFolderName');
    fireEvent.change(name, { target: { value: 'a/b?' } });
    expect(screen.getByRole('button', { name: 'intel.common.create' })).toBeDisabled();
    fireEvent.change(name, { target: { value: '2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'intel.common.create' }));
    await waitFor(() => expect(onFolder).toHaveBeenCalledWith('/Reports/2026'));
  });
});

describe('FileDetailDialog', () => {
  it('shows the index warning and owner actions for the owner', () => {
    renderWithProviders(<FileDetailDialog file={file()} folders={['/']} onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByText('preview:Q3.pdf')).toBeInTheDocument();
    expect(screen.getByText('This PDF has no text layer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.media.trash' })).toBeInTheDocument();
  });

  it('is read-only for someone else’s team file and offers restore/purge in Trash', () => {
    const first = renderWithProviders(<FileDetailDialog file={file({ owner_id: 'someone', visibility: 'TEAM' })} folders={['/']} onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByText('intel.media.notOwner')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'intel.media.trash' })).not.toBeInTheDocument();
    first.unmount();
    renderWithProviders(<FileDetailDialog file={file({ deleted: true })} folders={['/']} onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'intel.media.restore' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.purge' }));
    expect(screen.getByText('intel.media.purgeTitle')).toBeInTheDocument();
  });
});
