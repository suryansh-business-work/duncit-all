import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import type { IntelConnector, IntelSyncRun } from '@duncit/gql-types';
import { INTEL_DISCOVER_TOOLS, INTEL_SET_CONNECTOR_PAUSED, INTEL_SYNC_CONNECTOR, INTEL_USAGE } from '../../src/graphql/admin';
import { INTEL_APPROVALS } from '../../src/graphql/approvals';
import { INTEL_CONVERSATIONS, INTEL_COUNTS, INTEL_DELETE_CONVERSATION, INTEL_UPDATE_CONVERSATION } from '../../src/graphql/chat';
import { INTEL_ARCHIVE_MEDIA, INTEL_REINDEX_MEDIA, INTEL_UPDATE_MEDIA } from '../../src/graphql/media';
import ApprovalsPage from '../../src/pages/approvals';
import ChatsPage from '../../src/pages/chats';
import AnswerMarkdown from '../../src/pages/chat/messages/AnswerMarkdown';
import ComposerControls from '../../src/pages/chat/composer/ComposerControls';
import FileDetailDialog from '../../src/pages/media/FileDetailDialog';
import UploadZone from '../../src/pages/media/UploadZone';
import ConnectorCard from '../../src/pages/settings/connectors/ConnectorCard';
import UsageSection from '../../src/pages/settings/usage';
import ConnectorFreshness from '../../src/pages/sync/ConnectorFreshness';
import SyncRunsTable from '../../src/pages/sync/SyncRunsTable';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@duncit/table', async (importOriginal) => ({ ...(await importOriginal<object>()), DuncitTable: (await import('../table-probe')).TableProbe }));
vi.mock('../../src/pages/media/FilePreview', () => ({ default: () => <div>preview</div> }));

beforeEach(() => {
  boot.value = bootstrap({}, { user_id: 'owner-1' });
});

const now = new Date().toISOString();
const conv = { __typename: 'IntelConversation', id: 'c1', title: 'Pod earnings', pinned: false, archived: false, model: 'gpt-4o', environment: 'STAGING', sources: [], message_count: 4, last_message_at: now, created_at: now, updated_at: now };
const counts = { request: { query: INTEL_COUNTS }, result: { data: { intelConversationCounts: { __typename: 'IntelConversationCounts', recent: 1, pinned: 0, archived: 0, all: 1 } } }, maxUsageCount: 10 };
const listMock = { request: { query: INTEL_CONVERSATIONS, variables: { view: 'RECENT', sort: 'RECENT', search: null, page: 1, page_size: 30 } }, result: { data: { intelConversations: { __typename: 'IntelConversationPage', total: 31, rows: [conv] } } }, maxUsageCount: 10 };

describe('chat history actions', () => {
  const openMenu = async () => fireEvent.click(await screen.findByRole('button', { name: 'intel.chats.actions:Pod earnings' }));
  const render = (extra: object[]) => renderWithProviders(<></>, { mocks: [counts, listMock, ...extra], initialEntries: ['/chats/recent'], routes: <Route path="/chats/:view" element={<ChatsPage />} /> });

  it('pins and archives from the row menu', async () => {
    const pin = { request: { query: INTEL_UPDATE_CONVERSATION, variables: { id: 'c1', patch: { pinned: true } } }, result: { data: { intelUpdateConversation: { ...conv, pinned: true } } } };
    const archive = { request: { query: INTEL_UPDATE_CONVERSATION, variables: { id: 'c1', patch: { archived: true } } }, result: { data: { intelUpdateConversation: { ...conv, archived: true } } } };
    render([pin, archive]);
    await openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'intel.chats.pin' }));
    await openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'intel.chats.archive' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('renames through the validated dialog', async () => {
    const rename = { request: { query: INTEL_UPDATE_CONVERSATION, variables: { id: 'c1', patch: { title: 'Host payouts' } } }, result: { data: { intelUpdateConversation: { ...conv, title: 'Host payouts' } } } };
    render([rename]);
    await openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'intel.chats.rename.action' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/intel.chats.rename.label/), { target: { value: 'Host payouts' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'intel.common.save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes after confirmation, and offers more pages when there are more', async () => {
    const remove = { request: { query: INTEL_DELETE_CONVERSATION, variables: { id: 'c1' } }, result: { data: { intelDeleteConversation: true } } };
    render([remove]);
    expect(await screen.findByRole('button', { name: 'intel.common.loadMore' })).toBeInTheDocument();
    await openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'intel.chats.delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'intel.chats.delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

const media = { __typename: 'IntelMedia', id: 'f1', owner_id: 'owner-1', name: 'Q3.pdf', folder: '/', mime: 'application/pdf', size: 10, visibility: 'PRIVATE', favorite: false, archived: false, deleted: false, index_status: 'INDEXED', index_method: 'PDF', index_warning: '', page_count: 1, chunk_count: 1, indexed_at: now, created_at: now, updated_at: now };

describe('file actions', () => {
  it('favourites, re-indexes, archives and saves details through the server', async () => {
    const mocks = [
      { request: { query: INTEL_UPDATE_MEDIA, variables: { id: 'f1', patch: { favorite: true } } }, result: { data: { intelUpdateMedia: { ...media, favorite: true } } } },
      { request: { query: INTEL_REINDEX_MEDIA, variables: { id: 'f1' } }, result: { data: { intelReindexMedia: media } } },
      { request: { query: INTEL_ARCHIVE_MEDIA, variables: { id: 'f1', archived: true } }, result: { data: { intelArchiveMedia: { ...media, archived: true } } } },
      { request: { query: INTEL_UPDATE_MEDIA, variables: { id: 'f1', patch: { name: 'Q3 final.pdf', folder: '/', visibility: 'PRIVATE' } } }, result: { data: { intelUpdateMedia: { ...media, name: 'Q3 final.pdf' } } } },
    ];
    const onChanged = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<FileDetailDialog file={media} folders={['/']} onClose={onClose} onChanged={onChanged} />, { mocks });
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.favorite' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.reindex' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText(/intel.media.details.name/), { target: { value: 'Q3 final.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'intel.common.save' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.archive' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

const connector = (over: Partial<IntelConnector> = {}): IntelConnector => ({
  __typename: 'IntelConnector', id: 'k1', kind: 'MCP', name: 'Duncit MCP', environment: 'PRODUCTION', env_entry_id: 'e1', env_entry_name: '', enabled: true, config: '{}',
  tools: [{ __typename: 'IntelTool', name: 'pods_delete', description: 'Delete a pod', class: 'DESTRUCTIVE', override: null, effective: 'DESTRUCTIVE', input_schema: '{}' }],
  status: 'IDLE', sync_paused: true, last_sync_at: null, last_success_at: null, last_error: '', indexed_count: 0, created_at: now, updated_at: now, ...over,
});

describe('connector and sync controls', () => {
  it('syncs, resumes and fully syncs from the freshness card', async () => {
    const mocks = [
      { request: { query: INTEL_SYNC_CONNECTOR, variables: { id: 'k1', full: false } }, result: { data: { intelSyncConnector: 'run1' } } },
      { request: { query: INTEL_SYNC_CONNECTOR, variables: { id: 'k1', full: true } }, result: { data: { intelSyncConnector: 'run2' } } },
      { request: { query: INTEL_SET_CONNECTOR_PAUSED, variables: { id: 'k1', paused: false } }, result: { data: { intelSetConnectorPaused: connector({ sync_paused: false }) } } },
    ];
    const onChanged = vi.fn();
    renderWithProviders(<ConnectorFreshness connector={connector()} onChanged={onChanged} />, { mocks });
    // Each button waits for the previous action: the card disables them while one runs.
    fireEvent.click(screen.getByRole('button', { name: 'intel.sync.syncNow' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'intel.sync.fullSync' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'intel.sync.fullSync' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'intel.sync.resume' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'intel.sync.resume' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(3));
  });

  it('discovers tools, shows a missing entry and asks before deleting', async () => {
    const actions = { testing: false, discovering: false, test: vi.fn(), toggle: vi.fn(), sync: vi.fn(), discover: vi.fn(), setToolClass: vi.fn(), remove: vi.fn() };
    const onEdit = vi.fn();
    renderWithProviders(<ConnectorCard connector={connector()} actions={actions as never} testResult={{ __typename: 'IntelTestResult', ok: true, message: 'Connected.', details: [] }} onEdit={onEdit} />);
    expect(screen.getByText('intel.settings.connectors.entryLine:intel.settings.connectors.entryMissing')).toBeInTheDocument();
    expect(screen.getByText('Connected.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.connectors.discover' }));
    expect(actions.discover).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'intel.sync.syncNow' }));
    expect(actions.sync).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1' }), false);
    fireEvent.click(screen.getByRole('button', { name: 'intel.common.edit' }));
    expect(onEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'intel.common.delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'intel.common.delete' }));
    expect(actions.remove).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.connectors.showTools:1' }));
    expect(await screen.findByText('pods_delete')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'intel.settings.connectors.overrideFor:pods_delete' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.settings.connectors.class.READ' }));
    expect(actions.setToolClass).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1' }), 'pods_delete', 'READ');
  });

  it('opens a run’s log from the runs table', async () => {
    const run: IntelSyncRun = { __typename: 'IntelSyncRun', id: 'r1', connector_id: 'k1', connector_name: 'Team Slack', kind: 'SLACK', mode: 'FULL', trigger: 'MANUAL', status: 'PARTIAL', error: 'rate limited', log: ['read #general'], started_at: now, finished_at: now, created_at: now, stats: { __typename: 'IntelSyncStats', seen: 5, indexed: 3, unchanged: 1, failed: 1, deleted: 0 } };
    renderWithProviders(<SyncRunsTable runs={[run]} />);
    fireEvent.click(await screen.findByText('Team Slack'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('read #general');
    expect(dialog).toHaveTextContent('rate limited');
  });
});

describe('filters, uploads, controls and markdown', () => {
  it('filters approvals by status and to my own requests', async () => {
    const q = (status: string | null, mine: boolean) => ({ request: { query: INTEL_APPROVALS, variables: { status, mine, limit: 100 } }, result: { data: { intelApprovals: [] } } });
    renderWithProviders(<></>, { mocks: [q('PENDING', false), q('EXECUTED', false), q('EXECUTED', true)], initialEntries: ['/approvals'], routes: <Route path="/approvals" element={<ApprovalsPage />} /> });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /intel.approvals.statusLabel/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.approval.status.EXECUTED' }));
    fireEvent.click(screen.getByRole('switch', { name: 'intel.approvals.mineOnly' }));
    expect(await screen.findByText('intel.approvals.empty')).toBeInTheDocument();
  });

  it('opens the picker from Enter and Space and passes picked files on', () => {
    const onFiles = vi.fn();
    const onClear = vi.fn();
    renderWithProviders(<UploadZone items={[{ id: 'd', name: 'done.pdf', progress: 100, status: 'done' }]} maxMb={100} types={['application/pdf']} onFiles={onFiles} onClear={onClear} />);
    const zone = screen.getByRole('button', { name: 'intel.media.dropLabel' });
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    fireEvent.keyDown(zone, { key: 'Enter' });
    fireEvent.keyDown(zone, { key: ' ' });
    expect(click).toHaveBeenCalledTimes(2);
    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    expect(onFiles).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'intel.media.clearFinished' }));
    expect(onClear).toHaveBeenCalled();
    click.mockRestore();
  });

  it('changes model, environment and sources (picking every source means all)', () => {
    const onChange = vi.fn();
    renderWithProviders(<ComposerControls value={{ model: 'gpt-4o', environment: 'STAGING', sources: ['GITHUB'] }} onChange={onChange} models={(boot.value as ReturnType<typeof bootstrap>).models} environments={['STAGING']} allowedSources={['GITHUB', 'MEDIA']} onVoice={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'intel.composer.model' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.composer.modelValue:GPT-4o mini' }));
    expect(onChange).toHaveBeenLastCalledWith({ model: 'gpt-4o-mini', environment: 'STAGING', sources: ['GITHUB'] });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'intel.composer.sources' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.sources.MEDIA' }));
    expect(onChange).toHaveBeenLastCalledWith({ model: 'gpt-4o', environment: 'STAGING', sources: [] });
  });

  it('renders code, tables and external links safely', () => {
    renderWithProviders(<AnswerMarkdown text={'Use `find()`.\n\n```js\nconst a = 1;\n```\n\n| Pod | Seats |\n| --- | --- |\n| Yoga | 10 |\n\n- [Docs](https://example.com)\n\n<script>alert(1)</script>'} />);
    expect(screen.getByRole('table')).toHaveTextContent('Yoga');
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(document.querySelector('script')).toBeNull();
  });

  it('switches the usage period', async () => {
    const u = (days: number) => ({ request: { query: INTEL_USAGE, variables: { days } }, result: { data: { intelUsage: { __typename: 'IntelUsage', days, total_calls: days, total_tokens: 1, total_cost_usd: 0, by_task: [{ __typename: 'IntelUsageRow', key: 'intel.chat', calls: 1, tokens: 1, cost_usd: 0.5 }], by_model: [], by_day: [] } } } });
    renderWithProviders(<UsageSection />, { mocks: [u(30), u(7)] });
    expect(await screen.findByText('intel.chat')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /intel.settings.usage.period/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'intel.settings.usage.lastDays:7' }));
    expect(await screen.findByText('7')).toBeInTheDocument();
  });
});

describe('discover tools mutation shape', () => {
  it('is a mutation the server defines', () => {
    expect(INTEL_DISCOVER_TOOLS.definitions[0]).toMatchObject({ operation: 'mutation' });
  });
});
