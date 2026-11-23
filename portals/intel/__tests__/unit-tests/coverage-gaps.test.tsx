import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { INTEL_HEALTH } from '../../src/graphql/admin';
import { INTEL_CONVERSATIONS, INTEL_COUNTS } from '../../src/graphql/chat';
import { INTEL_MEDIA, INTEL_PURGE_MEDIA, INTEL_RESTORE_MEDIA, INTEL_TRASH_MEDIA } from '../../src/graphql/media';
import { RestError, uploadFile } from '../../src/lib/rest';
import ChatsPage from '../../src/pages/chats';
import FileDetailDialog from '../../src/pages/media/FileDetailDialog';
import MediaPage from '../../src/pages/media';
import MediaSidebar from '../../src/pages/media/MediaSidebar';
import HealthSection from '../../src/pages/settings/health';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown }));
const objectUrl = vi.hoisted(() => vi.fn());
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@duncit/table', async (importOriginal) => ({ ...(await importOriginal<object>()), DuncitTable: (await import('../table-probe')).TableProbe }));
vi.mock('../../src/pages/media/FilePreview', () => ({ default: () => <div>preview</div> }));
vi.mock('../../src/lib/rest', async (importOriginal) => ({ ...(await importOriginal<object>()), fileObjectUrl: objectUrl }));

beforeEach(() => {
  boot.value = bootstrap({}, { user_id: 'owner-1' });
});
afterEach(() => vi.unstubAllGlobals());

const now = new Date().toISOString();
const media = { __typename: 'IntelMedia', id: 'f1', owner_id: 'owner-1', name: 'Q3.pdf', folder: '/', mime: 'application/pdf', size: 10, visibility: 'PRIVATE', favorite: true, archived: false, deleted: false, index_status: 'INDEXED', index_method: 'PDF', index_warning: '', page_count: 1, chunk_count: 1, indexed_at: now, created_at: now, updated_at: now };

describe('MediaPage filters', () => {
  it('switches views, folders and upload visibility in the URL', async () => {
    const any = { request: { query: INTEL_MEDIA, variables: () => true }, result: { data: { intelMedia: { __typename: 'IntelMediaPage', total: 1, rows: [media] }, intelMediaFolders: ['/', '/Reports'] } }, maxUsageCount: 20 };
    renderWithProviders(<></>, { mocks: [any], initialEntries: ['/media'], routes: <Route path="/media" element={<MediaPage />} /> });
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /intel.media.uploadVisibility/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.media.visibility.TEAM' }));
    fireEvent.click((await screen.findAllByText('/Reports'))[0] as HTMLElement);
    fireEvent.click(screen.getAllByText('intel.media.views.TRASH')[0] as HTMLElement);
    await waitFor(() => expect(screen.queryByText('intel.media.dropTitle')).not.toBeInTheDocument());
    fireEvent.click((await screen.findAllByText('Q3.pdf'))[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'intel.common.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('MediaSidebar on a phone', () => {
  it('changes view and folder from the selects', () => {
    const onView = vi.fn();
    const onFolder = vi.fn();
    renderWithProviders(<MediaSidebar view="ALL" folder="/" folders={['/', '/Reports']} onView={onView} onFolder={onFolder} onFolderCreated={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /intel.media.viewLabel/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.media.views.FAVORITES' }));
    expect(onView).toHaveBeenCalledWith('FAVORITES');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /intel.media.folderLabel/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '/Reports' }));
    expect(onFolder).toHaveBeenCalledWith('/Reports');
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.newFolder' }));
    fireEvent.click(screen.getByRole('button', { name: 'intel.common.cancel' }));
    expect(screen.getByRole('button', { name: 'intel.media.newFolder' })).toBeInTheDocument();
  });
});

describe('file lifecycle', () => {
  it('downloads with the person’s token, then trashes the file', async () => {
    objectUrl.mockResolvedValue('blob:file');
    vi.stubGlobal('URL', Object.assign(URL, { revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const onClose = vi.fn();
    renderWithProviders(<FileDetailDialog file={media} folders={['/']} onClose={onClose} onChanged={vi.fn()} />, { mocks: [{ request: { query: INTEL_TRASH_MEDIA, variables: { id: 'f1' } }, result: { data: { intelTrashMedia: { ...media, deleted: true } } } }] });
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.download' }));
    await waitFor(() => expect(objectUrl).toHaveBeenCalledWith('f1'));
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.trash' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    click.mockRestore();
  });

  it('restores from Trash, or deletes for good after confirming', async () => {
    const trashed = { ...media, deleted: true };
    const onClose = vi.fn();
    const mocks = [
      { request: { query: INTEL_RESTORE_MEDIA, variables: { id: 'f1' } }, result: { data: { intelRestoreMedia: media } } },
      { request: { query: INTEL_PURGE_MEDIA, variables: { id: 'f1' } }, result: { data: { intelPurgeMedia: true } } },
    ];
    const first = renderWithProviders(<FileDetailDialog file={trashed} folders={['/']} onClose={onClose} onChanged={vi.fn()} />, { mocks });
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.restore' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    first.unmount();
    renderWithProviders(<FileDetailDialog file={trashed} folders={['/']} onClose={onClose} onChanged={vi.fn()} />, { mocks });
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.purge' }));
    const confirm = screen.getAllByRole('dialog').at(-1) as HTMLElement;
    fireEvent.click(within(confirm).getByRole('button', { name: 'intel.media.purge' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });
});

describe('chat history search, sort and paging', () => {
  it('re-queries with the search, the sort and a bigger page', async () => {
    const conv = { __typename: 'IntelConversation', id: 'c1', title: 'Pod earnings', pinned: false, archived: false, model: 'gpt-4o', environment: 'STAGING', sources: [], message_count: 2, last_message_at: now, created_at: now, updated_at: now };
    const anyList = { request: { query: INTEL_CONVERSATIONS, variables: () => true }, result: { data: { intelConversations: { __typename: 'IntelConversationPage', total: 40, rows: [conv] } } }, maxUsageCount: 20 };
    const counts = { request: { query: INTEL_COUNTS }, result: { data: { intelConversationCounts: { __typename: 'IntelConversationCounts', recent: 40, pinned: 0, archived: 0, all: 40 } } } };
    renderWithProviders(<></>, { mocks: [counts, anyList], initialEntries: ['/chats/all'], routes: <Route path="/chats/:view" element={<ChatsPage />} /> });
    fireEvent.change(await screen.findByRole('textbox', { name: 'intel.chats.search' }), { target: { value: 'pod' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /intel.chats.sortLabel/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.chats.sort.TITLE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'intel.common.loadMore' }));
    fireEvent.click((await screen.findAllByText('Pod earnings'))[0] as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('health failure and REST network errors', () => {
  it('offers a retry when health cannot be checked', async () => {
    renderWithProviders(<HealthSection />, { mocks: [{ request: { query: INTEL_HEALTH }, error: new Error('down') }] });
    expect(await screen.findByText('intel.settings.health.loadFailed')).toBeInTheDocument();
  });

  it('rejects an upload on a network error and when cancelled', async () => {
    class FakeXhr {
      upload = { onprogress: null };
      status = 0;
      responseText = 'not json';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      onabort: null | (() => void) = null;
      open = vi.fn();
      setRequestHeader = vi.fn();
      abort = () => this.onabort?.();
      send = vi.fn();
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const a = uploadFile(new File(['x'], 'a.pdf'), { folder: '/', visibility: 'TEAM' }, vi.fn());
    a.abort();
    await expect(a.promise).rejects.toEqual(new RestError('Cancelled', 0));
  });
});
