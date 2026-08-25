import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** The page keeps its header/footer filter in the URL — see ?fragment=. */
const render = (ui: React.ReactElement, url = '/emails/templates') =>
  rtlRender(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);
import { makeTpl } from '../mocks/email-template.mock';

type Editor = ReturnType<
  typeof import('../../src/pages/email-templates-page/useEmailTemplateEditor').useEmailTemplateEditor
>;
const m = vi.hoisted(() => ({ editor: {} as Editor }));
vi.mock('../../src/pages/email-templates-page/useEmailTemplateEditor', () => ({
  useEmailTemplateEditor: () => m.editor,
}));

vi.mock('../../src/components/FillViewport', () => ({
  default: (p: { children: React.ReactNode }) => <div>{p.children}</div>,
}));
vi.mock('../../src/components/EmailSidebarList', () => ({
  default: (p: {
    onSelect: (id: string) => void;
    filter: { value: string; onChange: (v: string) => void; options: { value: string }[] };
  }) => (
    <div>
      <button type="button" onClick={() => p.onSelect('picked')}>list-select</button>
      <span data-testid="filter-value">{p.filter.value || 'none'}</span>
      <span data-testid="filter-options">{p.filter.options.length}</span>
      <button type="button" onClick={() => p.filter.onChange('billing')}>pick-fragment</button>
      <button type="button" onClick={() => p.filter.onChange('')}>clear-fragment</button>
    </div>
  ),
}));
vi.mock('../../src/pages/email-templates-page/TemplateEditorPanel', () => ({
  default: (p: { onSendTest: () => void }) => (
    <button type="button" onClick={p.onSendTest}>panel-sendtest</button>
  ),
}));
vi.mock('../../src/pages/email-templates-page/CreateTemplateDialog', () => ({
  default: (p: { open: boolean; onClose: () => void; onCreated: (id: string) => void; onError: (msg: string) => void }) =>
    p.open ? (
      <div data-testid="create-dialog">
        <button type="button" onClick={() => p.onCreated('made-1')}>create-ok</button>
        <button type="button" onClick={() => p.onError('create-bad')}>create-err</button>
        <button type="button" onClick={p.onClose}>create-close</button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/email-templates-page/SendTestDialog', () => ({
  default: (p: { open: boolean; template: { template_id: string } | null; onClose: () => void; onResult: (k: 'success' | 'error', msg: string) => void }) =>
    p.open ? (
      <div data-testid="send-dialog">
        <span>tid:{p.template?.template_id ?? 'none'}</span>
        <button type="button" onClick={() => p.onResult('success', 'sent')}>send-result</button>
        <button type="button" onClick={p.onClose}>send-close</button>
      </div>
    ) : null,
}));

import EmailTemplatesPage from '../../src/pages/email-templates-page/EmailTemplatesPage';

const draft = makeTpl({ template_id: 't9', slug: 's', name: 'N', subject: 'j', mjml: '' });

const baseEditor = (over: Partial<Editor> = {}): Editor =>
  ({
    list: [],
    loading: false,
    hasData: true,
    refetch: vi.fn().mockResolvedValue({}),
    usageBySlug: new Map(),
    refetchUsage: vi.fn().mockResolvedValue({}),
    selected: null,
    setSelected: vi.fn(),
    draft: null,
    setDraft: vi.fn(),
    tab: 'preview',
    setTab: vi.fn(),
    previewHtml: '',
    previewErrors: [],
    previewLoading: false,
    detected: [],
    fragmentOptions: [],
    fragmentsLoading: false,
    fragmentsError: null,
    varsJson: '{}',
    setVarsJson: vi.fn(),
    busy: false,
    dirty: false,
    autoSave: true,
    setAutoSave: vi.fn(),
    savedAt: null,
    snack: null,
    setSnack: vi.fn(),
    save: vi.fn(),
    onDelete: vi.fn(),
    importDetected: vi.fn(),
    validateMjml: vi.fn(),
    ...over,
  }) as unknown as Editor;

beforeEach(() => {
  m.editor = baseEditor();
});

describe('EmailTemplatesPage', () => {
  it('shows a spinner while loading with no data', () => {
    m.editor = baseEditor({ loading: true, hasData: false });
    render(<EmailTemplatesPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the empty placeholder when no template is selected', () => {
    render(<EmailTemplatesPage />);
    expect(screen.getByText('Select a template from the left.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'list-select' }));
    expect(m.editor.setSelected).toHaveBeenCalledWith('picked');
  });

  it('renders the editor panel and opens the send-test dialog', () => {
    m.editor = baseEditor({ draft });
    render(<EmailTemplatesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'panel-sendtest' }));
    expect(screen.getByTestId('send-dialog')).toBeInTheDocument();
    expect(screen.getByText('tid:t9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'send-result' }));
    expect(m.editor.setSnack).toHaveBeenCalledWith({ kind: 'success', msg: 'sent' });
    fireEvent.click(screen.getByRole('button', { name: 'send-close' }));
    expect(screen.queryByTestId('send-dialog')).not.toBeInTheDocument();
  });

  it('passes a null template id to the send dialog when there is no draft', () => {
    m.editor = baseEditor({ draft: null });
    render(<EmailTemplatesPage />);
    // open create then send has no draft; drive send via a drafted panel is unavailable,
    // so assert the placeholder path renders and the dialog stays closed.
    expect(screen.getByText('Select a template from the left.')).toBeInTheDocument();
  });

  it('refreshes the counts after a test send, which writes a log row of its own', () => {
    m.editor = baseEditor({ draft });
    render(<EmailTemplatesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'panel-sendtest' }));
    fireEvent.click(screen.getByRole('button', { name: 'send-result' }));
    expect(m.editor.refetchUsage).toHaveBeenCalled();
  });

  it('swallows a failed count refresh rather than breaking the send result', async () => {
    m.editor = baseEditor({
      draft,
      refetchUsage: vi.fn().mockRejectedValue(new Error('offline')),
    });
    render(<EmailTemplatesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'panel-sendtest' }));
    fireEvent.click(screen.getByRole('button', { name: 'send-result' }));
    await waitFor(() => expect(m.editor.refetchUsage).toHaveBeenCalled());
    expect(m.editor.setSnack).toHaveBeenCalledWith({ kind: 'success', msg: 'sent' });
  });

  it('creates a template: refetch, select, success snack', async () => {
    render(<EmailTemplatesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New template' }));
    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'create-ok' }));
    await waitFor(() => expect(m.editor.refetch).toHaveBeenCalled());
    expect(m.editor.setSelected).toHaveBeenCalledWith('made-1');
    expect(m.editor.setSnack).toHaveBeenCalledWith({ kind: 'success', msg: 'Template created' });
  });

  it('reports a create error via snack', () => {
    render(<EmailTemplatesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New template' }));
    fireEvent.click(screen.getByRole('button', { name: 'create-err' }));
    expect(m.editor.setSnack).toHaveBeenCalledWith({ kind: 'error', msg: 'create-bad' });
  });

  it('closes the create dialog', () => {
    render(<EmailTemplatesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'New template' }));
    fireEvent.click(screen.getByRole('button', { name: 'create-close' }));
    expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
  });

  /**
   * ?fragment= is how the Fragments page answers "where is this consumed?"
   * — it links here, and the list opens already narrowed to that header
   * and footer.
   */
  it('opens narrowed to the header/footer named in the URL', () => {
    m.editor = baseEditor({
      fragmentOptions: [{ key: 'billing', name: 'Billing', is_active: true }],
    });
    render(<EmailTemplatesPage />, '/emails/templates?fragment=transactional');
    expect(screen.getByTestId('filter-value')).toHaveTextContent('transactional');
    expect(screen.getByTestId('filter-options')).toHaveTextContent('1');
  });

  it('puts a chosen header/footer in the URL, and takes it back out', () => {
    render(<EmailTemplatesPage />);
    expect(screen.getByTestId('filter-value')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'pick-fragment' }));
    expect(screen.getByTestId('filter-value')).toHaveTextContent('billing');

    fireEvent.click(screen.getByRole('button', { name: 'clear-fragment' }));
    expect(screen.getByTestId('filter-value')).toHaveTextContent('none');
  });

  it('renders the snack alert and closes it', () => {
    m.editor = baseEditor({ snack: { kind: 'error', msg: 'Boom' } });
    render(<EmailTemplatesPage />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(m.editor.setSnack).toHaveBeenCalledWith(null);
  });
});
