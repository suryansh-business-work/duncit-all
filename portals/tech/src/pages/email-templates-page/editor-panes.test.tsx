import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Tpl } from './queries';

// MjmlEditorPane deps
vi.mock('@monaco-editor/react', () => ({
  default: (p: { value: string; onChange: (v: string | undefined) => void }) => (
    <div>
      <textarea data-testid="monaco" value={p.value} onChange={(e) => p.onChange(e.target.value)} />
      <button type="button" onClick={() => p.onChange(undefined)}>monaco-clear</button>
    </div>
  ),
}));
vi.mock('../../components/MjmlAiButton', () => ({
  default: (p: { onApply: (v: string) => void }) => (
    <button type="button" onClick={() => p.onApply('<ai/>')}>ai-apply</button>
  ),
}));
vi.mock('@duncit/utils', () => ({ formatMjml: (s: string) => `FMT:${s}` }));

// TemplateEditorPanel children (stubbed to isolate the panel's own wiring)
vi.mock('./PreviewVariablesPane', () => ({ default: () => <div data-testid="preview-pane" /> }));
vi.mock('./EditorActionsBar', () => ({
  default: (p: { onSave: () => void; onSendTest: () => void; onDelete: () => void }) => (
    <div>
      <button type="button" onClick={p.onSave}>bar-save</button>
      <button type="button" onClick={p.onSendTest}>bar-test</button>
      <button type="button" onClick={p.onDelete}>bar-delete</button>
    </div>
  ),
}));

import MjmlEditorPane from './MjmlEditorPane';
import TemplateEditorPanel from './TemplateEditorPanel';

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

const tpl: Tpl = {
  template_id: 't1', slug: 'welcome', name: 'Welcome', subject: 'Hi', mjml: '<mjml/>',
  variables: [], is_active: true, description: '',
};

describe('TemplateEditorPanel', () => {
  it('wires the name/subject/mjml fields and the action bar', () => {
    const setDraft = vi.fn();
    const onSave = vi.fn();
    const onSendTest = vi.fn();
    const onDelete = vi.fn();
    render(
      <TemplateEditorPanel
        draft={tpl}
        setDraft={setDraft}
        dirty
        busy={false}
        tab="preview"
        setTab={vi.fn()}
        previewHtml=""
        previewErrors={[]}
        detected={[]}
        varsJson="{}"
        setVarsJson={vi.fn()}
        onValidate={vi.fn()}
        onImportDetected={vi.fn()}
        onSave={onSave}
        onSendTest={onSendTest}
        onDelete={onDelete}
      />,
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
