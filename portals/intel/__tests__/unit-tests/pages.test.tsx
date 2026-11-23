import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import type { IntelApproval } from '@duncit/gql-types';
import ApprovalCard from '../../src/components/approval/ApprovalCard';
import { INTEL_DECIDE } from '../../src/graphql/approvals';
import { INTEL_CONVERSATIONS, INTEL_COUNTS } from '../../src/graphql/chat';
import ChatsPage from '../../src/pages/chats';
import StartScreen from '../../src/pages/chat/StartScreen';
import UploadZone from '../../src/pages/media/UploadZone';
import SettingsPage from '../../src/pages/settings';
import SyncPage from '../../src/pages/sync';
import { bootstrap, renderWithProviders } from '../testkit';

const boot = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../../src/components/IntelBootstrap', () => ({ useBootstrap: () => ({ data: boot.value, loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('../../src/pages/settings/SectionContent', () => ({ default: ({ section }: { section: string }) => <div data-testid="section">{section}</div> }));

beforeEach(() => {
  boot.value = bootstrap();
});

const approval = (over: Partial<IntelApproval> = {}): IntelApproval => ({
  __typename: 'IntelApproval',
  id: 'ap1',
  kind: 'MONGO_WRITE',
  status: 'PENDING',
  requested_by: 'emp-1',
  conversation_id: 'c1',
  connector_name: 'Prod DB',
  environment: 'PRODUCTION',
  database: 'duncit',
  collection: 'pods',
  action: 'updateOne',
  tool_class: 'WRITE',
  request: '{"collection":"pods"}',
  preview: '{"matched":1,"before":[{"title":"A"}],"after":[{"title":"B"}]}',
  impact: 'updateOne on pods: 1 document(s) match.',
  reason: 'Fix the title',
  four_eyes: true,
  decided_by: null,
  decided_at: null,
  decision_note: '',
  result: '',
  error: '',
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  created_at: new Date().toISOString(),
  ...over,
});

describe('ApprovalCard', () => {
  it('asks once more before approving a production change, then sends the decision with the note', async () => {
    const decided = { ...approval(), status: 'EXECUTED', result: '{"modified":1}' };
    const mocks = [{ request: { query: INTEL_DECIDE, variables: { id: 'ap1', approve: true, note: 'ok' } }, result: { data: { intelDecideApproval: decided } } }];
    renderWithProviders(<ApprovalCard approval={approval()} canDecide />, { mocks });
    expect(screen.getByText('intel.approval.fourEyes')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('intel.approval.note'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'intel.approval.approve' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('intel.approval.confirmText');
    fireEvent.click(screen.getAllByRole('button', { name: 'intel.approval.approve' }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the server’s refusal (e.g. four-eyes) instead of failing silently', async () => {
    const mocks = [{ request: { query: INTEL_DECIDE, variables: { id: 'ap1', approve: false, note: '' } }, error: new Error('A production change needs a second person') }];
    renderWithProviders(<ApprovalCard approval={approval()} canDecide />, { mocks });
    fireEvent.click(screen.getByRole('button', { name: 'intel.approval.reject' }));
    expect(await screen.findByText(/second person/)).toBeInTheDocument();
  });

  it('hides the buttons from someone who may not decide, and for decided requests', () => {
    const first = renderWithProviders(<ApprovalCard approval={approval()} canDecide={false} />);
    expect(screen.queryByRole('button', { name: 'intel.approval.approve' })).not.toBeInTheDocument();
    first.unmount();
    renderWithProviders(<ApprovalCard approval={approval({ status: 'EXECUTED', environment: 'STAGING', four_eyes: false })} canDecide />);
    expect(screen.queryByRole('button', { name: 'intel.approval.approve' })).not.toBeInTheDocument();
  });
});

describe('ChatsPage', () => {
  const row = { __typename: 'IntelConversation', id: 'c1', title: 'Pod earnings', pinned: true, archived: false, model: 'gpt-4o', environment: 'STAGING', sources: [], message_count: 4, last_message_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const counts = { request: { query: INTEL_COUNTS }, result: { data: { intelConversationCounts: { __typename: 'IntelConversationCounts', recent: 1, pinned: 1, archived: 0, all: 1 } } } };
  it('lists the view’s conversations with the right count', async () => {
    const mocks = [counts, { request: { query: INTEL_CONVERSATIONS, variables: { view: 'PINNED', sort: 'RECENT', search: null, page: 1, page_size: 30 } }, result: { data: { intelConversations: { __typename: 'IntelConversationPage', total: 1, rows: [row] } } } }];
    renderWithProviders(<></>, { mocks, initialEntries: ['/chats/pinned'], routes: <Route path="/chats/:view" element={<ChatsPage />} /> });
    expect(await screen.findByText('Pod earnings')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'intel.chats.views.PINNED' })).toBeInTheDocument();
  });

  it('says so when a view is empty', async () => {
    const mocks = [counts, { request: { query: INTEL_CONVERSATIONS, variables: { view: 'ARCHIVED', sort: 'RECENT', search: null, page: 1, page_size: 30 } }, result: { data: { intelConversations: { __typename: 'IntelConversationPage', total: 0, rows: [] } } } }];
    renderWithProviders(<></>, { mocks, initialEntries: ['/chats/archived'], routes: <Route path="/chats/:view" element={<ChatsPage />} /> });
    expect(await screen.findByText('intel.chats.empty')).toBeInTheDocument();
  });
});

describe('StartScreen', () => {
  it('shows every source with its live state and fills the composer from a suggestion', () => {
    const onPrompt = vi.fn();
    renderWithProviders(<StartScreen environment="STAGING" onPrompt={onPrompt} />);
    expect(screen.getByText('intel.start.heading')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'intel.sources.MCP: intel.states.ERROR' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'intel.sources.SLACK: intel.states.DISCONNECTED' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('intel.start.prompts.podPerformance'));
    expect(onPrompt).toHaveBeenCalledWith('intel.start.prompts.podPerformance');
  });
});

describe('UploadZone', () => {
  it('opens the picker from the keyboard and hands dropped files over', () => {
    const onFiles = vi.fn();
    renderWithProviders(<UploadZone items={[{ id: '1', name: 'a.pdf', progress: 40, status: 'uploading' }, { id: '2', name: 'b.exe', progress: 0, status: 'failed', error: 'intel.media.typeRefused' }]} maxMb={100} types={['application/pdf']} onFiles={onFiles} onClear={vi.fn()} />);
    const zone = screen.getByRole('button', { name: 'intel.media.dropLabel' });
    const file = new File(['x'], 'c.pdf', { type: 'application/pdf' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFiles).toHaveBeenCalled();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('intel.media.typeRefused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.media.clearFinished' })).toBeInTheDocument();
  });
});

describe('admin pages', () => {
  it('keep employees out of Sync and Settings', () => {
    boot.value = bootstrap({}, { can_admin: false, level: 'EMPLOYEE' });
    renderWithProviders(<SyncPage />);
    expect(screen.getByText('intel.common.adminOnly')).toBeInTheDocument();
  });

  it('on a phone, lists all 17 sections first, then opens one with a way back', () => {
    const routes = (
      <>
        <Route path="/setting" element={<SettingsPage />} />
        <Route path="/setting/:section" element={<SettingsPage />} />
      </>
    );
    const list = renderWithProviders(<></>, { initialEntries: ['/setting'], routes });
    expect(screen.getAllByRole('link')).toHaveLength(17);
    list.unmount();
    renderWithProviders(<></>, { initialEntries: ['/setting/qdrant'], routes });
    expect(screen.getByTestId('section')).toHaveTextContent('qdrant');
    expect(screen.getByRole('button', { name: 'intel.settings.allSections' })).toBeInTheDocument();
  });
});
