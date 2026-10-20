import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { makeTpl } from '../mocks/email-template.mock';

// MjmlEditorPane deps
vi.mock('@monaco-editor/react', () => ({
  default: (p: { value: string; onChange: (v: string | undefined) => void }) => (
    <div>
      <textarea data-testid="monaco" value={p.value} onChange={(e) => p.onChange(e.target.value)} />
      <button type="button" onClick={() => p.onChange(undefined)}>monaco-clear</button>
    </div>
  ),
}));
vi.mock('../../src/components/MjmlAiButton', () => ({
  default: (p: { onApply: (v: string) => void }) => (
    <button type="button" onClick={() => p.onApply('<ai/>')}>ai-apply</button>
  ),
}));
vi.mock('@duncit/utils', () => ({ formatMjml: (s: string) => `FMT:${s}` }));

// TemplateEditorPanel children (stubbed to isolate the panel's own wiring)
vi.mock('../../src/pages/email-templates-page/PreviewVariablesPane', () => ({ default: () => <div data-testid="preview-pane" /> }));
vi.mock('../../src/pages/email-templates-page/EditorActionsBar', () => ({
  default: (p: { onSave: () => void; onSendTest: () => void; onDelete: () => void; onReset?: () => void }) => (
    <div>
      <button type="button" onClick={p.onSave}>bar-save</button>
      <button type="button" onClick={p.onSendTest}>bar-test</button>
      <button type="button" onClick={p.onDelete}>bar-delete</button>
      {p.onReset && (
        <button type="button" onClick={p.onReset}>
          bar-reset
        </button>
      )}
    </div>
  ),
}));

import MjmlEditorPane from '../../src/pages/email-templates-page/MjmlEditorPane';
import TemplateEditorPanel from '../../src/pages/email-templates-page/TemplateEditorPanel';

describe('MjmlEditorPane', () => {
  it('edits, formats, clears and validates', () => {
    const onChange = vi.fn();
    const onValidate = vi.fn();
    render(<MjmlEditorPane value="<mjml/>" onChange={onChange} onValidate={onValidate} />);

    fireEvent.change(screen.getByTestId('monaco'), { target: { value: '<x/>' } });
    expect(onChange).toHaveBeenCalledWith('<x/>');

    fireEvent.click(screen.getByRole('button', { name: 'monaco-clear' }));
    expect(onChange).toHaveBeenCalledWith(''); // undefined -> ''

    fireEvent.click(screen.getByTestId('FormatAlignLeftIcon').closest('button')!);
    expect(onChange).toHaveBeenCalledWith('FMT:<mjml/>');

    fireEvent.click(screen.getByTestId('FactCheckIcon').closest('button')!);
    expect(onValidate).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ai-apply' }));
    expect(onChange).toHaveBeenCalledWith('<ai/>');
  });
});

const tpl = makeTpl({ mjml: '<mjml/>' });

const panelProps = (over: Partial<React.ComponentProps<typeof TemplateEditorPanel>> = {}) => ({
  draft: tpl,
  setDraft: vi.fn(),
  usage: null,
  dirty: false,
  busy: false,
  tab: 'preview' as const,
  setTab: vi.fn(),
  previewHtml: '',
  previewErrors: [],
  previewLoading: false,
  detected: [],
  fragmentOptions: [{ key: 'transactional', name: 'Transactional', is_active: true }],
  varsJson: '{}',
  setVarsJson: vi.fn(),
  autoSave: false,
  onAutoSaveChange: vi.fn(),
  savedAt: null,
  onValidate: vi.fn(),
  onImportDetected: vi.fn(),
  onSave: vi.fn(),
  onSendTest: vi.fn(),
  onDelete: vi.fn(),
  onReset: vi.fn(),
  ...over,
});

describe('TemplateEditorPanel — header, switch and footer note', () => {
  it('writes the footer note, the active switch and the chosen fragment into the draft', () => {
    const setDraft = vi.fn();
    render(
      <MemoryRouter>
        <TemplateEditorPanel {...panelProps({ setDraft })} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Footer note'), { target: { value: 'You joined a pod' } });
    expect(setDraft).toHaveBeenLastCalledWith({ ...tpl, footer_note: 'You joined a pod' });

    fireEvent.click(screen.getByRole('switch'));
    expect(setDraft).toHaveBeenLastCalledWith({ ...tpl, is_active: false });

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Transactional'));
    expect(setDraft).toHaveBeenLastCalledWith({ ...tpl, fragment_key: 'transactional' });
  });

  it('offers Reset design only on a template that ships with Duncit', () => {
    const onReset = vi.fn();
    const { unmount } = render(
      <MemoryRouter>
        <TemplateEditorPanel {...panelProps({ draft: { ...tpl, is_shipped: true }, onReset })} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'bar-reset' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    unmount();

    render(
      <MemoryRouter>
        <TemplateEditorPanel {...panelProps({ draft: { ...tpl, is_shipped: false }, onReset })} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'bar-reset' })).toBeNull();
  });

  it('says plainly that a switched-off template sends nothing', () => {
    render(
      <MemoryRouter>
        <TemplateEditorPanel {...panelProps({ draft: { ...tpl, is_active: false } })} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Disabled — nothing will send')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });
});

describe('TemplateEditorPanel', () => {
  it('wires the name/subject/mjml fields and the action bar', () => {
    const setDraft = vi.fn();
    const onSave = vi.fn();
    const onSendTest = vi.fn();
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
      <TemplateEditorPanel
        draft={tpl}
        setDraft={setDraft}
        usage={null}
        dirty
        busy={false}
        tab="preview"
        setTab={vi.fn()}
        previewHtml=""
        previewErrors={[]}
        previewLoading={false}
        detected={[]}
        fragmentOptions={[]}
        varsJson="{}"
        setVarsJson={vi.fn()}
        autoSave
        onAutoSaveChange={vi.fn()}
        savedAt={null}
        onValidate={vi.fn()}
        onImportDetected={vi.fn()}
        onSave={onSave}
        onSendTest={onSendTest}
        onDelete={onDelete}
        onReset={vi.fn()}
      />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } });
    expect(setDraft).toHaveBeenCalledWith({ ...tpl, name: 'Renamed' });

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'New subject' } });
    expect(setDraft).toHaveBeenCalledWith({ ...tpl, subject: 'New subject' });

    // Slug is display-only.
    expect(screen.getByLabelText('Slug')).toBeDisabled();

    // MjmlEditorPane onChange -> setDraft mjml
    fireEvent.change(screen.getByTestId('monaco'), { target: { value: '<new/>' } });
    expect(setDraft).toHaveBeenCalledWith({ ...tpl, mjml: '<new/>' });

    fireEvent.click(screen.getByRole('button', { name: 'bar-save' }));
    fireEvent.click(screen.getByRole('button', { name: 'bar-test' }));
    fireEvent.click(screen.getByRole('button', { name: 'bar-delete' }));
    expect(onSave).toHaveBeenCalled();
    expect(onSendTest).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
