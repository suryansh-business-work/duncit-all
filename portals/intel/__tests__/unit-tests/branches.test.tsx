import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import type { IntelApproval, IntelConnector } from '@duncit/gql-types';
import ApprovalPreview from '../../src/components/approval/ApprovalPreview';
import { INTEL_HEALTH, INTEL_INDEX, INTEL_REBUILD_INDEX, INTEL_SET_CONNECTOR_PAUSED, INTEL_SYNC_CONNECTOR } from '../../src/graphql/admin';
import { INTEL_CONVERSATIONS, INTEL_COUNTS, INTEL_UPDATE_CONVERSATION } from '../../src/graphql/chat';
import { fileObjectUrl, transcribeAudio, uploadFile } from '../../src/lib/rest';
import KnowledgePage from '../../src/pages/knowledge';
import ChatsPage from '../../src/pages/chats';
import StartScreen from '../../src/pages/chat/StartScreen';
import FilePreview from '../../src/pages/media/FilePreview';
import HealthSection from '../../src/pages/settings/health';
import QdrantSection from '../../src/pages/settings/qdrant';
import ConnectorFreshness from '../../src/pages/sync/ConnectorFreshness';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown, loading: false }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: boot.loading, error: null, refetch: vi.fn() }) }));
vi.mock('@duncit/table', async (importOriginal) => ({ ...(await importOriginal<object>()), DuncitTable: (await import('../table-probe')).TableProbe }));

beforeEach(() => {
  boot.value = bootstrap();
  boot.loading = false;
  localStorage.setItem('intel_token', 'tok');
});
afterEach(() => vi.unstubAllGlobals());

const now = new Date().toISOString();
const healthData = (over: object) => ({
  request: { query: INTEL_HEALTH },
  result: { data: { intelHealth: { __typename: 'IntelHealth', qdrant_configured: true, qdrant_reachable: true, queue_configured: true, openai_configured: true, openai_entry_selected: true, failed_runs_24h: 0, pending_approvals: 0, collections: [{ __typename: 'IntelCollectionHealth', scope: 'SHARED', name: 'intel_shared', exists: false, status: 'missing', points: 0, dimensions: null, dimension_mismatch: false }], connector_errors: [], ...over } } },
  maxUsageCount: 5,
});

describe('health and Qdrant states', () => {
  it('reports everything healthy', async () => {
    renderWithProviders(<HealthSection />, { mocks: [healthData({})] });
    expect(await screen.findByText('intel.settings.health.queueOn')).toBeInTheDocument();
    expect(screen.getAllByText('intel.settings.health.up').length).toBeGreaterThan(0);
  });

  it('reports a down index and missing OpenAI key', async () => {
    renderWithProviders(<HealthSection />, { mocks: [healthData({ qdrant_reachable: false, openai_configured: false })] });
    expect(await screen.findByText('intel.settings.health.down')).toBeInTheDocument();
    expect(screen.getByText('intel.settings.health.openaiMissing')).toBeInTheDocument();
  });

  it('Qdrant: not configured and unreachable disables rebuild', async () => {
    renderWithProviders(<QdrantSection />, { mocks: [healthData({ qdrant_configured: false, qdrant_reachable: false, collections: [] })] });
    expect(await screen.findByText('intel.settings.qdrant.notConfigured')).toBeInTheDocument();
    expect(screen.getByText('intel.settings.qdrant.none')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.settings.qdrant.rebuildAll' })).toBeDisabled();
  });

  it('Qdrant: a failed rebuild of everything is reported', async () => {
    const failing = { request: { query: INTEL_REBUILD_INDEX, variables: { scope: null } }, error: new Error('Qdrant down') };
    renderWithProviders(<QdrantSection />, { mocks: [healthData({}), failing] });
    expect(await screen.findByText('intel.settings.qdrant.missing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.qdrant.rebuildAll' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'intel.settings.qdrant.rebuild' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

const approval = (over: Partial<IntelApproval>): IntelApproval => ({ __typename: 'IntelApproval', id: 'a', kind: 'MCP_CALL', status: 'EXECUTED', requested_by: 'u', conversation_id: '', connector_name: 'x', environment: 'STAGING', database: '', collection: '', action: 't', tool_class: 'WRITE', request: 'not json', preview: 'not json', impact: '', reason: '', four_eyes: false, decided_by: null, decided_at: null, decision_note: '', result: '{"ok":true}', error: '', expires_at: now, created_at: now, ...over });

describe('ApprovalPreview', () => {
  it('shows raw text when the request is not JSON, and the result', () => {
    renderWithProviders(<ApprovalPreview approval={approval({})} />);
    fireEvent.click(screen.getByText('intel.approval.details'));
    expect(screen.getByText('not json')).toBeInTheDocument();
    expect(screen.getByText(/"ok": true/)).toBeInTheDocument();
  });

  it('explains when no after-preview exists (a delete)', () => {
    renderWithProviders(<ApprovalPreview approval={approval({ request: '{}', preview: '{"matched":2,"before":[{"a":1}],"after":[]}', result: '' })} />);
    fireEvent.click(screen.getByText('intel.approval.details'));
    expect(screen.getByText('intel.approval.before:2')).toBeInTheDocument();
    expect(screen.getByText('intel.approval.afterUnavailable')).toBeInTheDocument();
  });
});

describe('FilePreview', () => {
  it('shows an image, text, or a warning when the file cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(new Blob(['png']), { status: 200 })).mockResolvedValueOnce(new Response(new Blob(['hello text']), { status: 200 })).mockResolvedValueOnce(new Response('hello text', { status: 200 })).mockResolvedValueOnce(new Response('{}', { status: 403 })));
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:1'), revokeObjectURL: vi.fn() }));
    const img = renderWithProviders(<FilePreview id="1" mime="image/png" name="pic.png" />);
    expect(await screen.findByRole('img', { name: 'pic.png' })).toHaveAttribute('src', 'blob:1');
    img.unmount();
    const txt = renderWithProviders(<FilePreview id="2" mime="text/plain" name="a.txt" />);
    expect(await screen.findByText('hello text')).toBeInTheDocument();
    txt.unmount();
    renderWithProviders(<FilePreview id="3" mime="application/pdf" name="a.pdf" />);
    expect(await screen.findByText('intel.media.previewFailed')).toBeInTheDocument();
  });
});

describe('REST edge cases', () => {
  it('falls back to the HTTP status when an error body is not JSON, and to "" for an empty transcript', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('oops', { status: 502 })).mockResolvedValueOnce(new Response('{}', { status: 200 })));
    await expect(fileObjectUrl('x')).rejects.toThrow('HTTP 502');
    await expect(transcribeAudio(new Blob([]))).resolves.toBe('');
  });

  it('resolves a successful upload and ignores progress it cannot measure', async () => {
    class OkXhr {
      upload = { onprogress: null as null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) };
      status = 0;
      responseText = '';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      onabort: null | (() => void) = null;
      open = vi.fn();
      setRequestHeader = vi.fn();
      abort = vi.fn();
      send = vi.fn(() => {
        this.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 });
        this.status = 201;
        this.responseText = '{"id":"f9"}';
        this.onload?.();
      });
    }
    vi.stubGlobal('XMLHttpRequest', OkXhr);
    const progress = vi.fn();
    await expect(uploadFile<{ id: string }>(new File(['x'], 'a.pdf'), { folder: '/', visibility: 'TEAM' }, progress).promise).resolves.toEqual({ id: 'f9' });
    expect(progress).not.toHaveBeenCalled();
  });

  it('rejects on a network error with an unreadable body', async () => {
    class BadXhr {
      upload = { onprogress: null };
      status = 500;
      responseText = '<html>';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      onabort: null | (() => void) = null;
      open = vi.fn();
      setRequestHeader = vi.fn();
      abort = vi.fn();
      send = vi.fn(() => this.onload?.());
    }
    vi.stubGlobal('XMLHttpRequest', BadXhr);
    await expect(uploadFile(new File(['x'], 'a.pdf'), { folder: '/', visibility: 'TEAM' }, vi.fn()).promise).rejects.toThrow('HTTP 500');
  });
});

describe('loading and empty states', () => {
  it('shows skeleton source cards while the bootstrap loads', () => {
    boot.value = null;
    boot.loading = true;
    const { container } = renderWithProviders(<StartScreen environment="PRODUCTION" onPrompt={vi.fn()} />);
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(8);
    expect(screen.getByText('intel.brand.title')).toBeInTheDocument();
  });

  it('lists failed and internal-link documents in Knowledge', async () => {
    const data = { intelIndexStats: [], intelIndexDocuments: { __typename: 'IntelIndexPage', total: 1, rows: [{ __typename: 'IntelIndexDocument', id: 'd2', source: 'MEDIA', connector_id: 'media', scope: 'SHARED', title: 'notes.txt', url: '/media?file=2', version: 1, chunk_count: 0, status: 'FAILED', error: 'quota', indexed_at: null }] } };
    renderWithProviders(<KnowledgePage />, { mocks: [{ request: { query: INTEL_INDEX, variables: () => true }, result: { data }, maxUsageCount: 3 }] });
    expect(await screen.findByText('notes.txt')).toBeInTheDocument();
    expect(screen.getByText('intel.knowledge.failed')).toBeInTheDocument();
  });
});

describe('action failures are reported', () => {
  const connector: IntelConnector = { __typename: 'IntelConnector', id: 'k', kind: 'GITHUB', name: 'Repo', environment: 'BOTH', env_entry_id: 'e', env_entry_name: 'Gh', enabled: false, config: '{}', tools: [], status: 'ERROR', sync_paused: false, last_sync_at: now, last_success_at: null, last_error: 'Bad credentials', indexed_count: 0, created_at: now, updated_at: now };

  it('keeps sync off for a disabled connector and reports a failed pause', async () => {
    const pause = { request: { query: INTEL_SET_CONNECTOR_PAUSED, variables: { id: 'k', paused: true } }, error: new Error('nope') };
    const onChanged = vi.fn();
    renderWithProviders(<ConnectorFreshness connector={connector} onChanged={onChanged} />, { mocks: [pause, { request: { query: INTEL_SYNC_CONNECTOR, variables: () => true }, result: { data: { intelSyncConnector: 'r' } } }] });
    expect(screen.getByRole('button', { name: 'intel.sync.syncNow' })).toBeDisabled();
    expect(screen.getByText('Bad credentials')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.sync.pause' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'intel.sync.pause' })).toBeEnabled());
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('keeps a conversation as it was when pinning fails', async () => {
    const conv = { __typename: 'IntelConversation', id: 'c1', title: 'Pod earnings', pinned: true, archived: true, model: 'gpt-4o', environment: 'PRODUCTION', sources: [], message_count: 1, last_message_at: now, created_at: now, updated_at: now };
    const mocks = [
      { request: { query: INTEL_COUNTS }, result: { data: { intelConversationCounts: { __typename: 'IntelConversationCounts', recent: 0, pinned: 1, archived: 1, all: 1 } } }, maxUsageCount: 5 },
      { request: { query: INTEL_CONVERSATIONS, variables: () => true }, result: { data: { intelConversations: { __typename: 'IntelConversationPage', total: 1, rows: [conv] } } }, maxUsageCount: 5 },
      { request: { query: INTEL_UPDATE_CONVERSATION, variables: { id: 'c1', patch: { pinned: false } } }, error: new Error('nope') },
      { request: { query: INTEL_UPDATE_CONVERSATION, variables: { id: 'c1', patch: { archived: false } } }, result: { data: { intelUpdateConversation: { ...conv, archived: false } } } },
    ];
    renderWithProviders(<></>, { mocks, initialEntries: ['/chats/archived'], routes: <Route path="/chats/:view" element={<ChatsPage />} /> });
    fireEvent.click(await screen.findByRole('button', { name: 'intel.chats.actions:Pod earnings' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'intel.chats.unpin' }));
    fireEvent.click(await screen.findByRole('button', { name: 'intel.chats.actions:Pod earnings' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'intel.chats.restore' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
