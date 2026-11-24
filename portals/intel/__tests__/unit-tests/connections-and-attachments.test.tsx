import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Route } from 'react-router';
import type { IntelConnector, IntelEntryOption, IntelSourceCard } from '@duncit/gql-types';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { INTEL_DISCONNECT_GMAIL, INTEL_GMAIL_ACCOUNTS, INTEL_GMAIL_CONNECT_URL, INTEL_PICKERS_BRANCHES, INTEL_PICKERS_REPOS } from '../../src/graphql/admin';
import { fileObjectUrl, uploadFile } from '../../src/lib/rest';
import SourceCard from '../../src/pages/chat/SourceCard';
import Composer from '../../src/pages/chat/composer/Composer';
import MessageAttachments from '../../src/pages/chat/messages/MessageAttachments';
import ConnectorCard from '../../src/pages/settings/connectors/ConnectorCard';
import GmailAccounts from '../../src/pages/settings/connectors/GmailAccounts';
import { ConnectorForm, EMPTY_CONFIG, type ConnectorValues } from '../../src/pages/settings/connectors/connector-form';
import GithubFields from '../../src/pages/settings/connectors/fields/GithubFields';
import TagsField from '../../src/pages/settings/connectors/fields/TagsField';
import { bootstrap, renderWithProviders } from '../testkit';

vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<object>()), notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../src/lib/rest', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  uploadFile: vi.fn(() => ({ promise: Promise.resolve({ id: 'media-1' }), abort: vi.fn() })),
  fileObjectUrl: vi.fn(async () => 'blob:intel/file'),
}));
vi.mock('../../src/pages/chat/composer/MicButton', () => ({ default: () => null }));

const anyVars = () => true;
beforeEach(() => vi.clearAllMocks());

describe('SourceCard', () => {
  const card = (over: Partial<IntelSourceCard>): IntelSourceCard => ({ __typename: 'IntelSourceCard', source: 'QDRANT', state: 'CONNECTED', connectors: 1, indexed: 0, last_sync_at: null, detail: 'vector_index', ...over });

  it('says why a source is in error, as the server reported it', () => {
    renderWithProviders(<SourceCard card={card({ state: 'ERROR', detail: 'unreachable' })} />);
    expect(screen.getByText('intel.sources.detail.unreachable')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'intel.sources.QDRANT: intel.states.ERROR. intel.sources.detail.unreachable' })).toBeInTheDocument();
  });

  it('explains media errors caused by the index', () => {
    renderWithProviders(<SourceCard card={card({ source: 'MEDIA', state: 'ERROR', detail: 'index_down' })} />);
    expect(screen.getByText('intel.sources.detail.indexDown')).toBeInTheDocument();
  });

  it('counts models for OpenAI and items elsewhere', () => {
    renderWithProviders(<SourceCard card={card({ source: 'OPENAI', detail: 'models', indexed: 2 })} />);
    expect(screen.getByText('intel.sources.detail.models:2')).toBeInTheDocument();
  });
});

function TagsHarness({ onValue }: Readonly<{ onValue: (v: unknown) => void }>) {
  const { control, watch } = useForm<{ channels: Array<{ id: string; name: string }> }>({ defaultValues: { channels: [] } });
  onValue(watch('channels'));
  return <TagsField control={control as never} name="channels" label="Channels" hint="hint" asObjects allLabel="All channels" options={[{ value: 'C1', label: '#general' }, { value: 'C2', label: '#ops' }]} />;
}

describe('TagsField “All” option', () => {
  it('selects every channel at once and then stops offering itself', () => {
    let value: unknown = null;
    renderWithProviders(<TagsHarness onValue={(v) => (value = v)} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Channels' }));
    fireEvent.click(screen.getByRole('option', { name: 'All channels' }));
    expect(value).toEqual([{ id: 'C1', name: '#general' }, { id: 'C2', name: '#ops' }]);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Channels' }));
    expect(screen.queryByRole('option', { name: 'All channels' })).not.toBeInTheDocument();
  });
});

describe('Composer attachments', () => {
  const boot = bootstrap();
  const renderComposer = (draft = '') => {
    const onSend = vi.fn();
    const view = renderWithProviders(<Composer settings={{ model: 'gpt-4o', environment: 'STAGING', sources: [] }} onSettings={vi.fn()} models={boot.models} environments={['STAGING']} allowedSources={[]} busy={false} streaming={false} draft={draft} onDraft={vi.fn()} onSend={onSend} onStop={vi.fn()} uploadMaxMb={1} uploadTypes={['application/pdf', 'image/png', 'text/plain']} />);
    const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
    return { onSend, input };
  };

  it('offers only images and PDFs, uploads to the private chat folder and sends the file with the question', async () => {
    const { onSend, input } = renderComposer('What is in this?');
    expect(input.accept).toBe('application/pdf,image/png');
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })] } });
    expect(uploadFile).toHaveBeenCalledWith(expect.any(File), { folder: '/intel.composer.attachFolder', visibility: 'PRIVATE' }, expect.any(Function));
    expect(await screen.findByText('report.pdf')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'intel.composer.send' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'intel.composer.send' }));
    expect(onSend).toHaveBeenCalledWith('What is in this?', ['media-1']);
    expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
  });

  it('can send files alone, with a default question', async () => {
    const { onSend, input } = renderComposer('');
    fireEvent.change(input, { target: { files: [new File(['png'], 'chart.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'intel.composer.send' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'intel.composer.send' }));
    expect(onSend).toHaveBeenCalledWith('intel.composer.attachmentsOnly', ['media-1']);
  });

  it('refuses other types and files over the size limit before uploading', () => {
    const { input } = renderComposer();
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' }), new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', { type: 'image/png' })] } });
    expect(notifyError).toHaveBeenCalledWith('intel.composer.attachTypeRefused:notes.txt');
    expect(notifyError).toHaveBeenCalledWith('intel.composer.attachTooLarge:big.png,1');
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('keeps Send off while a file uploads and shows a failed upload', async () => {
    let fail: (e: Error) => void = () => undefined;
    vi.mocked(uploadFile).mockReturnValueOnce({ promise: new Promise((_, reject) => (fail = reject)), abort: vi.fn() });
    const { input } = renderComposer('hi');
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'slow.pdf', { type: 'application/pdf' })] } });
    expect(screen.getByRole('button', { name: 'intel.composer.send' })).toBeDisabled();
    await act(async () => fail(new Error('boom')));
    expect(await screen.findByText('slow.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.composer.send' })).toBeEnabled();
  });
});

describe('MessageAttachments', () => {
  it('opens a sent file in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderWithProviders(<MessageAttachments attachments={[{ __typename: 'IntelMessageAttachment', id: 'm1', name: 'q3.pdf', mime: 'application/pdf' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'intel.chat.openAttachment:q3.pdf' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('blob:intel/file', '_blank', 'noopener'));
    expect(fileObjectUrl).toHaveBeenCalledWith('m1');
  });

  it('renders nothing without attachments', () => {
    const { container } = renderWithProviders(<MessageAttachments attachments={[]} />);
    expect(container.textContent).toBe('');
  });
});

describe('GmailAccounts', () => {
  const accounts = (rows: unknown[]) => ({ request: { query: INTEL_GMAIL_ACCOUNTS }, result: { data: { intelGmailAccounts: rows } }, maxUsageCount: 5 });
  const row = { __typename: 'IntelGmailAccount', id: 'a1', email: 'team@duncit.test', connected_at: new Date().toISOString(), connector_id: 'c1' };

  it('lists connected mailboxes and asks the server for Google’s consent page', async () => {
    const consent = vi.fn(() => ({ data: { intelGmailConnectUrl: '#google-consent' } }));
    renderWithProviders(<GmailAccounts onChanged={vi.fn()} />, { mocks: [accounts([row]), { request: { query: INTEL_GMAIL_CONNECT_URL }, result: consent }] });
    expect(await screen.findByText('team@duncit.test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.settings.gmail.connect' }));
    await waitFor(() => expect(consent).toHaveBeenCalled());
  });

  it('says what went wrong when the consent page cannot be opened', async () => {
    const failing = { request: { query: INTEL_GMAIL_CONNECT_URL }, error: new Error('Google OAuth is not set up') };
    renderWithProviders(<GmailAccounts onChanged={vi.fn()} />, { mocks: [accounts([]), failing] });
    fireEvent.click(await screen.findByRole('button', { name: 'intel.settings.gmail.connect' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });

  it('reports the result Google sent back and clears it', async () => {
    const onChanged = vi.fn();
    renderWithProviders(<></>, { mocks: [accounts([])], initialEntries: ['/setting/gmail?connected=team%40duncit.test'], routes: <Route path="/setting/gmail" element={<GmailAccounts onChanged={onChanged} />} /> });
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('intel.settings.gmail.connected:team@duncit.test'));
    expect(onChanged).toHaveBeenCalled();
    expect(await screen.findByText(/intel.settings.gmail.empty/)).toBeInTheDocument();
  });

  it('says a cancelled sign-in was cancelled', async () => {
    renderWithProviders(<></>, { mocks: [accounts([])], initialEntries: ['/setting/gmail?error=access_denied'], routes: <Route path="/setting/gmail" element={<GmailAccounts onChanged={vi.fn()} />} /> });
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('intel.settings.gmail.cancelled'));
  });

  it('disconnects a mailbox after confirming', async () => {
    const disconnect = { request: { query: INTEL_DISCONNECT_GMAIL, variables: anyVars }, result: { data: { intelDisconnectGmail: true } } };
    renderWithProviders(<GmailAccounts onChanged={vi.fn()} />, { mocks: [accounts([row]), disconnect] });
    fireEvent.click(await screen.findByRole('button', { name: 'intel.settings.gmail.disconnect' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'intel.settings.gmail.disconnect' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('intel.settings.gmail.disconnected'));
  });
});

describe('ConnectorForm credentials', () => {
  const builtin: IntelEntryOption = { __typename: 'IntelEntryOption', id: 'server', name: 'Duncit database', description: '', is_default: true, last_test_ok: null, environment: 'PRODUCTION', builtin: true };
  const values = (over: Partial<ConnectorValues>): ConnectorValues => ({ name: 'DB', environment: 'STAGING', env_entry_id: 'server', enabled: true, config: EMPTY_CONFIG.MONGODB, ...over });
  const renderForm = (kind: 'MONGODB' | 'GMAIL', v: ConnectorValues, entryName = '') =>
    renderWithProviders(<ConnectorForm open kind={kind} editing={false} values={v} entries={kind === 'MONGODB' ? [builtin] : []} entryName={entryName} saving={false} errorMessage={null} onSubmit={vi.fn()} onClose={vi.fn()} />);

  it('takes the environment from this server for its own database and locks it', async () => {
    renderForm('MONGODB', values({}));
    const env = screen.getByRole('combobox', { name: 'intel.settings.connectors.environment' });
    await waitFor(() => expect(env).toHaveTextContent('intel.env.PRODUCTION'));
    expect(env).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('intel.settings.connectors.builtinEnvironment:intel.env.PRODUCTION')).toBeInTheDocument();
  });

  it('asks for an Atlas URL, or a self-deployed host and user, when adding a database', () => {
    const { unmount } = renderForm('MONGODB', values({ env_entry_id: 'new:atlas' }));
    expect(screen.getByLabelText(/intel.settings.connectors.atlasUri/)).toBeInTheDocument();
    unmount();
    renderForm('MONGODB', values({ env_entry_id: 'new:self' }));
    for (const label of [/intel.settings.connectors.host/, /intel.settings.connectors.port/, /intel.settings.connectors.username/, /intel.settings.connectors.password/]) expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it('shows a Google-connected mailbox instead of environment and credentials', () => {
    renderForm('GMAIL', { name: 'team', environment: 'BOTH', env_entry_id: 'oauth', enabled: true, config: { ...EMPTY_CONFIG.GMAIL, account_id: 'a1' } }, 'team@duncit.test');
    expect(screen.getByText('intel.settings.gmail.account:team@duncit.test')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'intel.settings.connectors.environment' })).not.toBeInTheDocument();
  });
});

function GithubHarness() {
  const { control } = useForm<ConnectorValues>({ defaultValues: { name: 'gh', environment: 'BOTH', env_entry_id: 'e1', enabled: true, config: EMPTY_CONFIG.GITHUB } });
  return <GithubFields control={control as never} />;
}

describe('GithubFields', () => {
  it('fills the owner from the token, lists its repositories and takes the default branch', async () => {
    const repos = { request: { query: INTEL_PICKERS_REPOS, variables: anyVars }, result: { data: { intelGithubRepos: [{ __typename: 'IntelGithubRepo', owner: 'duncit-org', name: 'duncit-all', default_branch: 'staging' }, { __typename: 'IntelGithubRepo', owner: 'duncit-org', name: 'website', default_branch: 'main' }] } } };
    const branches = { request: { query: INTEL_PICKERS_BRANCHES, variables: anyVars }, result: { data: { intelGithubBranches: ['staging', 'main'] } }, maxUsageCount: 5 };
    renderWithProviders(<GithubHarness />, { mocks: [repos, branches] });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'intel.settings.connectors.owner' })).toHaveTextContent('duncit-org'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'intel.settings.connectors.repo' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'duncit-all' }));
    expect(screen.getByLabelText('intel.settings.connectors.branch')).toHaveValue('staging');
  });

  it('falls back to typing when the repositories cannot be listed, with the reason', async () => {
    const failing = { request: { query: INTEL_PICKERS_REPOS, variables: anyVars }, error: new Error('Bad credentials') };
    renderWithProviders(<GithubHarness />, { mocks: [failing] });
    expect(await screen.findByText(/intel.settings.connectors.reposFailed/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'intel.settings.connectors.owner' })).toBeInTheDocument();
  });
});

describe('ConnectorCard for built-in and Google-connected sources', () => {
  const now = new Date().toISOString();
  const done = () => vi.fn(async () => undefined);
  const actions = { testing: false, discovering: false, test: done(), toggle: done(), sync: done(), discover: done(), setToolClass: done(), remove: done() };
  const card = (over: Partial<IntelConnector>): IntelConnector => ({ __typename: 'IntelConnector', id: 'k1', kind: 'MCP', name: 'Duncit MCP', environment: 'STAGING', env_entry_id: 'duncit', env_entry_name: 'Duncit MCP', enabled: true, config: '{}', tools: [], status: 'OK', sync_paused: false, last_sync_at: null, last_success_at: null, last_error: '', indexed_count: 0, created_at: now, updated_at: now, ...over });

  it('Duncit MCP has nothing to discover and says it runs as each person', () => {
    renderWithProviders(<ConnectorCard connector={card({})} actions={actions as never} testResult={null} onEdit={vi.fn()} />);
    expect(screen.getByText('intel.settings.connectors.duncitNote')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'intel.settings.connectors.discover' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.common.delete' })).toBeInTheDocument();
  });

  it('a Google-connected mailbox is removed by disconnecting it, not from its card', () => {
    renderWithProviders(<ConnectorCard connector={card({ kind: 'GMAIL', name: 'team@duncit.test', env_entry_id: 'oauth', environment: 'BOTH', config: '{"account_id":"a1"}' })} actions={actions as never} testResult={null} onEdit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'intel.common.delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'intel.common.edit' })).toBeInTheDocument();
  });
});
