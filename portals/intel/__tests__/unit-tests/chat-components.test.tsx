import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { IntelMessage } from '@duncit/gql-types';
import Composer from '../../src/pages/chat/composer/Composer';
import AssistantMessage from '../../src/pages/chat/messages/AssistantMessage';
import Citations from '../../src/pages/chat/messages/Citations';
import ToolChips from '../../src/pages/chat/messages/ToolChips';
import UserMessage from '../../src/pages/chat/messages/UserMessage';
import { bootstrap, renderWithProviders } from '../testkit';

vi.mock('../../src/components/approval/MessageApprovals', () => ({ default: ({ ids }: { ids: string[] }) => <div data-testid="approvals">{ids.join(',')}</div> }));
vi.mock('../../src/pages/chat/composer/MicButton', () => ({ default: ({ onText }: { onText: (t: string) => void }) => <button type="button" onClick={() => onText('spoken words')}>mic</button> }));

const boot = bootstrap();
const settings = { model: 'gpt-4o', environment: 'STAGING', sources: [] as string[] };

function renderComposer(props: Partial<Parameters<typeof Composer>[0]> = {}) {
  const onSend = vi.fn();
  const onDraft = vi.fn();
  const onStop = vi.fn();
  renderWithProviders(<Composer settings={settings} onSettings={vi.fn()} models={boot.models} environments={['STAGING', 'PRODUCTION']} allowedSources={boot.me.sources} busy={false} streaming={false} draft="" onDraft={onDraft} onSend={onSend} onStop={onStop} uploadMaxMb={25} uploadTypes={['application/pdf', 'image/png', 'text/plain']} {...props} />);
  return { onSend, onDraft, onStop, input: screen.getByRole('textbox', { name: 'intel.composer.placeholder' }) };
}

describe('Composer', () => {
  it('sends the trimmed draft on Enter and clears it, but breaks the line on Shift+Enter', () => {
    const { onSend, onDraft, input } = renderComposer({ draft: '  pod revenue  ' });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('pod revenue', []);
    expect(onDraft).toHaveBeenCalledWith('');
  });

  it('cannot send an empty draft or while an answer is being prepared', () => {
    renderComposer({ draft: '   ' });
    expect(screen.getByRole('button', { name: 'intel.composer.send' })).toBeDisabled();
  });

  it('shows Stop while an answer streams', () => {
    const { onStop } = renderComposer({ draft: 'hi', streaming: true });
    fireEvent.click(screen.getByRole('button', { name: 'intel.composer.stop' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('appends dictated text to the draft', () => {
    const { onDraft } = renderComposer({ draft: 'show' });
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));
    expect(onDraft).toHaveBeenCalledWith('show spoken words');
  });

  it('offers Both only to people who may read both environments', () => {
    renderComposer();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'intel.composer.environment' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3);
  });
});

const message = (over: Partial<IntelMessage> = {}): IntelMessage => ({
  __typename: 'IntelMessage',
  id: 'a1',
  conversation_id: 'c1',
  role: 'ASSISTANT',
  content: 'Revenue grew [S1].',
  status: 'COMPLETE',
  citations: [{ __typename: 'IntelCitation', ref: 'S1', title: 'Q3 report.pdf', url: '/media?file=1', source: 'MEDIA', environment: 'SHARED', snippet: '…', page: 4, line_start: null, line_end: null }],
  tool_calls: [{ __typename: 'IntelToolCall', name: 'search_knowledge', title: 'Search: revenue', status: 'OK', summary: '1 passage' }],
  approval_ids: [],
  model: 'gpt-4o',
  error_code: null,
  error_message: null,
  edited: false,
  attachments: [],
  created_at: new Date().toISOString(),
  ...over,
});

describe('AssistantMessage', () => {
  it('renders the stored answer with its tools, a citation link and the source list', () => {
    renderWithProviders(<AssistantMessage message={message()} onRegenerate={vi.fn()} />);
    expect(screen.getByText(/Revenue grew/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'S1' })).toHaveAttribute('href', '#cite-S1');
    expect(screen.getByRole('link', { name: 'Q3 report.pdf' })).toHaveAttribute('href', '/media?file=1');
    expect(screen.getByText(/Search: revenue/)).toBeInTheDocument();
  });

  it('shows the live text while streaming, with no actions or sources yet', () => {
    renderWithProviders(<AssistantMessage message={message({ status: 'STREAMING', content: '' })} live={{ text: 'Partial answ', tools: [{ name: 'mongo_query', status: 'RUNNING' }] }} onRegenerate={vi.fn()} />);
    expect(screen.getByText('Partial answ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'intel.chat.regenerate' })).not.toBeInTheDocument();
    expect(screen.queryByText('Q3 report.pdf')).not.toBeInTheDocument();
  });

  it('explains a restricted turn and offers to answer again', () => {
    const onRegenerate = vi.fn();
    renderWithProviders(<AssistantMessage message={message({ status: 'FAILED', content: '', citations: [], error_code: 'RESTRICTED' })} onRegenerate={onRegenerate} />);
    expect(screen.getByRole('alert')).toHaveTextContent('intel.chat.errors.RESTRICTED');
    fireEvent.click(screen.getByRole('button', { name: 'intel.chat.regenerate' }));
    expect(onRegenerate).toHaveBeenCalled();
  });

  it('lists the approval cards an answer proposed', () => {
    renderWithProviders(<AssistantMessage message={message({ approval_ids: ['ap1', 'ap2'] })} />);
    expect(screen.getByTestId('approvals')).toHaveTextContent('ap1,ap2');
  });
});

describe('UserMessage', () => {
  it('edits in place and submits only a changed message', () => {
    const onEdit = vi.fn();
    renderWithProviders(<UserMessage content="old question" edited={false} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'intel.chat.editMessage' }));
    const box = screen.getByRole('textbox', { name: 'intel.chat.editMessage' });
    fireEvent.change(box, { target: { value: 'new question' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledWith('new question');
  });

  it('cancels with Escape and offers no edit while a turn runs', () => {
    const onEdit = vi.fn();
    const { rerender } = renderWithProviders(<UserMessage content="q" edited onEdit={onEdit} />);
    expect(screen.getByText('intel.chat.edited')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'intel.chat.editMessage' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onEdit).not.toHaveBeenCalled();
    rerender(<UserMessage content="q" edited={false} />);
    expect(screen.queryByRole('button', { name: 'intel.chat.editMessage' })).not.toBeInTheDocument();
  });
});

describe('Citations and ToolChips', () => {
  it('opens external sources in a new tab with page and line details', () => {
    renderWithProviders(<Citations items={[{ __typename: 'IntelCitation', ref: 'S3', title: 'repo/a.ts', url: 'https://github.com/x', source: 'GITHUB', environment: 'STAGING', snippet: '', page: null, line_start: 10, line_end: 20 }]} />);
    expect(screen.getByRole('link', { name: 'repo/a.ts' })).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/intel.chat.lines/)).toBeInTheDocument();
  });

  it('renders nothing without citations or tool calls', () => {
    const { container } = renderWithProviders(
      <>
        <Citations items={[]} />
        <ToolChips items={[]} />
      </>
    );
    expect(container.querySelector('section')).toBeNull();
  });
});
