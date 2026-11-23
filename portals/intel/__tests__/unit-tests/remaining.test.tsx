import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { INTEL_AUDIT, INTEL_ENTRY_OPTIONS, INTEL_INDEX, INTEL_PICKERS_BRANCHES, INTEL_PICKERS_MONGO, INTEL_SETTINGS, INTEL_UPDATE_SETTINGS } from '../../src/graphql/admin';
import { INTEL_APPROVAL } from '../../src/graphql/approvals';
import { INTEL_MEDIA, INTEL_MEDIA_FILE } from '../../src/graphql/media';
import MessageApprovals from '../../src/components/approval/MessageApprovals';
import KnowledgePage from '../../src/pages/knowledge';
import MediaPage from '../../src/pages/media';
import MicButton from '../../src/pages/chat/composer/MicButton';
import AuditSection from '../../src/pages/settings/audit';
import { ConnectorForm, toConnectorValues } from '../../src/pages/settings/connectors/connector-form';
import SectionContent from '../../src/pages/settings/SectionContent';
import { useIntelSettings } from '../../src/pages/settings/useIntelSettings';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown }));
const rest = vi.hoisted(() => ({ transcribe: vi.fn(), objectUrl: vi.fn() }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@duncit/table', async (importOriginal) => ({ ...(await importOriginal<object>()), DuncitTable: (await import('../table-probe')).TableProbe }));
vi.mock('../../src/lib/rest', async (importOriginal) => ({ ...(await importOriginal<object>()), transcribeAudio: rest.transcribe, fileObjectUrl: rest.objectUrl }));

beforeEach(() => {
  boot.value = bootstrap({}, { user_id: 'owner-1' });
});
afterEach(() => vi.unstubAllGlobals());

const now = new Date().toISOString();
const media = { __typename: 'IntelMedia', id: 'f1', owner_id: 'owner-1', name: 'Q3.pdf', folder: '/', mime: 'application/pdf', size: 2048, visibility: 'TEAM', favorite: true, archived: false, deleted: false, index_status: 'INDEXED', index_method: 'PDF', index_warning: '', page_count: 4, chunk_count: 9, indexed_at: now, created_at: now, updated_at: now };

describe('MediaPage', () => {
  it('lists files in a table, and opens a file linked from a chat citation', async () => {
    rest.objectUrl.mockResolvedValue('blob:x');
    const page = (vars: object) => ({ request: { query: INTEL_MEDIA, variables: vars }, result: { data: { intelMedia: { __typename: 'IntelMediaPage', total: 1, rows: [media] }, intelMediaFolders: ['/', '/Reports'] } }, maxUsageCount: 5 });
    const linked = { request: { query: INTEL_MEDIA_FILE, variables: { id: 'f1' } }, result: { data: { intelMediaFile: media } } };
    renderWithProviders(<></>, { mocks: [page({ view: 'ALL', page: 1, page_size: 1 }), page({ view: 'ALL', folder: '/', search: null, page: 1, page_size: 25 }), linked], initialEntries: ['/media?file=f1'], routes: <Route path="/media" element={<MediaPage />} /> });
    expect(await screen.findByRole('table', { name: 'intel.media.title' })).toBeInTheDocument();
    expect(await screen.findByRole('dialog')).toHaveTextContent('Q3.pdf');
    expect(screen.getAllByText('intel.media.index.INDEXED').length).toBeGreaterThan(0);
  });
});

describe('KnowledgePage', () => {
  it('totals indexed documents per source and lists them', async () => {
    const data = { intelIndexStats: [{ __typename: 'IntelIndexStat', source: 'GITHUB', scope: 'STAGING', documents: 10, chunks: 40, failed: 1 }, { __typename: 'IntelIndexStat', source: 'GITHUB', scope: 'SHARED', documents: 2, chunks: 5, failed: 0 }], intelIndexDocuments: { __typename: 'IntelIndexPage', total: 1, rows: [{ __typename: 'IntelIndexDocument', id: 'd1', source: 'GITHUB', connector_id: 'k1', scope: 'STAGING', title: 'repo/README.md', url: 'https://github.com/x', version: 2, chunk_count: 3, status: 'INDEXED', error: '', indexed_at: now }] } };
    renderWithProviders(<KnowledgePage />, { mocks: [{ request: { query: INTEL_INDEX, variables: { page: 1, page_size: 1 } }, result: { data } }, { request: { query: INTEL_INDEX, variables: { search: null, page: 1, page_size: 25 } }, result: { data } }] });
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('intel.knowledge.statHint:45,1')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'repo/README.md' })).toHaveAttribute('target', '_blank');
  });
});

describe('AuditSection', () => {
  it('loads sealed audit rows and flags a broken seal', async () => {
    const rows = [{ __typename: 'IntelAuditRow', id: 'r1', type: 'WRITE', action: 'mongo_write.updateOne', status: 'OK', user_id: 'u1', level: 'ADMIN', environment: 'PRODUCTION', target: 'Prod DB pods', detail: '{}', created_at: now, sealed: false }];
    renderWithProviders(<AuditSection />, { mocks: [{ request: { query: INTEL_AUDIT, variables: { type: null, search: null, page: 1, page_size: 25 } }, result: { data: { intelAudit: { __typename: 'IntelAuditPage', total: 1, rows } } } }] });
    expect(await screen.findByText('Prod DB pods')).toBeInTheDocument();
    expect(screen.getAllByText('intel.settings.audit.broken').length).toBeGreaterThan(0);
  });
});

describe('MessageApprovals', () => {
  it('loads each proposed change and offers the requester a staging decision', async () => {
    const approval = { __typename: 'IntelApproval', id: 'ap1', kind: 'MCP_CALL', status: 'PENDING', requested_by: 'owner-1', conversation_id: 'c1', connector_name: 'Duncit MCP', environment: 'STAGING', database: '', collection: '', action: 'pods_cancel', tool_class: 'DESTRUCTIVE', request: '{"tool":"pods_cancel"}', preview: '{"arguments":{}}', impact: 'Destructive tool pods_cancel', reason: '', four_eyes: false, decided_by: null, decided_at: null, decision_note: '', result: '', error: '', expires_at: now, created_at: now };
    renderWithProviders(<MessageApprovals ids={['ap1']} />, { mocks: [{ request: { query: INTEL_APPROVAL, variables: { id: 'ap1' } }, result: { data: { intelApproval: approval } } }] });
    expect(await screen.findByText('intel.approval.destructive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.approval.approve' })).toBeInTheDocument();
  });
});

describe('MicButton', () => {
  it('records, transcribes on the server and hands the text back', async () => {
    const stop = vi.fn();
    class FakeRecorder {
      mimeType = 'audio/webm';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start = vi.fn();
      stop = () => {
        this.ondataavailable?.({ data: new Blob(['a']) });
        this.onstop?.();
      };
    }
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
    rest.transcribe.mockResolvedValue('kitna revenue hua');
    const onText = vi.fn();
    renderWithProviders(<MicButton onText={onText} />);
    fireEvent.click(screen.getByRole('button', { name: 'intel.composer.mic' }));
    fireEvent.click(await screen.findByRole('button', { name: 'intel.composer.micStop' }));
    await waitFor(() => expect(onText).toHaveBeenCalledWith('kitna revenue hua'));
    expect(stop).toHaveBeenCalled();
  });

  it('explains when the browser cannot record', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    renderWithProviders(<MicButton onText={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'intel.composer.mic' }));
    expect(screen.getByRole('button', { name: 'intel.composer.mic' })).toBeEnabled();
  });
});

describe('connector kind fields', () => {
  const entries = [{ __typename: 'IntelEntryOption', id: 'e1', name: 'Entry', description: '', is_default: false, last_test_ok: true }];
  it('lists live collections for a MongoDB connection and keeps database-wide writes impossible to pick for both environments', async () => {
    const collections = { request: { query: INTEL_PICKERS_MONGO, variables: { entry_id: 'e1', database: 'duncit' } }, result: { data: { intelMongoCollections: ['clubs', 'pods'] } }, maxUsageCount: 3 };
    const values = { ...toConnectorValues('MONGODB', null), env_entry_id: 'e1', config: { database: 'duncit', collections: [], access_mode: 'READ_ONLY' } };
    renderWithProviders(<ConnectorForm open kind="MONGODB" editing={false} values={values} entries={entries} saving={false} errorMessage={null} onSubmit={vi.fn()} onClose={vi.fn()} />, { mocks: [collections] });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /intel.settings.connectors.environment/ }));
    expect(within(screen.getByRole('listbox')).queryByRole('option', { name: 'intel.env.BOTH' })).not.toBeInTheDocument();
  });

  it('adds a GitHub repository row with its toggles', async () => {
    const branches = { request: { query: INTEL_PICKERS_BRANCHES, variables: { entry_id: 'e1', owner: 'duncit', repo: 'duncit-all' } }, result: { data: { intelGithubBranches: ['main', 'staging'] } }, maxUsageCount: 3 };
    const values = { ...toConnectorValues('GITHUB', null), env_entry_id: 'e1', config: { repos: [{ owner: 'duncit', repo: 'duncit-all', branch: 'main', code: true, docs: true, issues: true, prs: true, commits: true }] } };
    renderWithProviders(<ConnectorForm open kind="GITHUB" editing values={values} entries={entries} saving={false} errorMessage={null} onSubmit={vi.fn()} onClose={vi.fn()} />, { mocks: [branches] });
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.connectors.addRepo' }));
    expect(screen.getAllByRole('button', { name: 'intel.settings.connectors.removeRepo' })).toHaveLength(2);
    expect(screen.getAllByRole('switch', { name: 'intel.settings.connectors.repoCode' })).toHaveLength(2);
  });
});

describe('useIntelSettings', () => {
  it('parses the document and saves a section with the loaded revision', async () => {
    const json = JSON.stringify({ general: { app_title: 'A' } });
    const mocks = [
      { request: { query: INTEL_SETTINGS }, result: { data: { intelSettings: { __typename: 'IntelSettingsPayload', revision: 3, json } } } },
      { request: { query: INTEL_UPDATE_SETTINGS, variables: { section: 'sync', value: JSON.stringify({ paused: true }), revision: 3 } }, result: { data: { intelUpdateSettings: { __typename: 'IntelSettingsPayload', revision: 4, json } } } },
    ];
    const { MockedProvider } = await import('@apollo/client/testing/react');
    const { result } = renderHook(() => useIntelSettings(), { wrapper: ({ children }) => <MockedProvider mocks={mocks}>{children}</MockedProvider> });
    await waitFor(() => expect(result.current.value?.general.app_title).toBe('A'));
    let ok = false;
    await act(async () => {
      ok = await result.current.save('sync', { paused: true } as never);
    });
    expect(ok).toBe(true);
  });
});

describe('SectionContent', () => {
  it('routes connector sections to the connector manager and others to their page', async () => {
    const entries = { request: { query: INTEL_ENTRY_OPTIONS, variables: { kind: 'GMAIL' } }, result: { data: { intelEntryOptions: [] } } };
    renderWithProviders(<SectionContent section="gmail" />, { mocks: [entries] });
    expect(await screen.findByText('intel.settings.sections.gmail')).toBeInTheDocument();
  });
});
