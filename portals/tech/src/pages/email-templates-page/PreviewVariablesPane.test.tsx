import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PreviewVariablesPane from './PreviewVariablesPane';
import type { Tpl } from './queries';

const baseDraft = (over: Partial<Tpl> = {}): Tpl => ({
  template_id: 't1',
  slug: 'welcome',
  name: 'Welcome',
  subject: 'Hi',
  mjml: '<mjml></mjml>',
  variables: [],
  is_active: true,
  ...over,
});

const renderPane = (props: Partial<React.ComponentProps<typeof PreviewVariablesPane>> = {}) => {
  const setDraft = vi.fn();
  const setTab = vi.fn();
  const setVarsJson = vi.fn();
  const onImportDetected = vi.fn();
  render(
    <PreviewVariablesPane
      draft={baseDraft()}
      setDraft={setDraft}
      tab="preview"
      setTab={setTab}
      previewHtml="<p>hi</p>"
      previewErrors={[]}
      detected={[]}
      varsJson="{}"
      setVarsJson={setVarsJson}
      onImportDetected={onImportDetected}
      {...props}
    />,
  );
  return { setDraft, setTab, setVarsJson, onImportDetected };
};

describe('PreviewVariablesPane — preview tab', () => {
  it('renders the preview iframe and shows preview errors when present', () => {
    renderPane({ previewErrors: ['err one', 'err two', 'err three', 'err four'] });
    expect(screen.getByTitle('preview')).toBeInTheDocument();
    // Only the first three errors are joined into the warning.
    expect(screen.getByText('err one · err two · err three')).toBeInTheDocument();
  });

  it('switches to the Variables tab', () => {
    const { setTab } = renderPane();
    fireEvent.click(screen.getByRole('tab', { name: /Variables/ }));
    expect(setTab).toHaveBeenCalledWith('code');
  });
});

describe('PreviewVariablesPane — variables tab', () => {
  it('shows the empty-detected hint and disables Sync when nothing detected', () => {
    renderPane({ tab: 'code', detected: [] });
    expect(screen.getByText(/No/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync to declared list' })).toBeDisabled();
  });

  it('lists detected chips, edits the JSON, and imports detected vars', () => {
    const { setVarsJson, onImportDetected } = renderPane({ tab: 'code', detected: ['name', 'app'] });
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('app')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('{"name":"Suryansh"}'), { target: { value: '{"name":"x"}' } });
    expect(setVarsJson).toHaveBeenCalledWith('{"name":"x"}');

    fireEvent.click(screen.getByRole('button', { name: 'Sync to declared list' }));
    expect(onImportDetected).toHaveBeenCalled();
  });

  it('shows the empty-declared hint when there are no declared variables', () => {
    renderPane({ tab: 'code', draft: baseDraft({ variables: [] }) });
    expect(screen.getByText(/to declare detected variables/)).toBeInTheDocument();
  });

  it('edits a declared variable key + description and deletes a row', () => {
    const draft = baseDraft({ variables: [{ key: 'name', description: 'the user name' }] });
    const setDraft = vi.fn();
    render(
      <PreviewVariablesPane
        draft={draft}
        setDraft={setDraft}
        tab="code"
        setTab={vi.fn()}
        previewHtml=""
        previewErrors={[]}
        detected={[]}
        varsJson="{}"
        setVarsJson={vi.fn()}
        onImportDetected={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('name'), { target: { value: 'first_name' } });
    expect(setDraft).toHaveBeenLastCalledWith({ ...draft, variables: [{ key: 'first_name', description: 'the user name' }] });

    fireEvent.change(screen.getByDisplayValue('the user name'), { target: { value: 'full name' } });
    expect(setDraft).toHaveBeenLastCalledWith({ ...draft, variables: [{ key: 'name', description: 'full name' }] });

    fireEvent.click(screen.getByTestId('DeleteIcon').closest('button')!);
    expect(setDraft).toHaveBeenLastCalledWith({ ...draft, variables: [] });
  });

  it('falls back to an empty description when none is set', () => {
    const draft = baseDraft({ variables: [{ key: 'name' }] });
    render(
      <PreviewVariablesPane
        draft={draft}
        setDraft={vi.fn()}
        tab="code"
        setTab={vi.fn()}
        previewHtml=""
        previewErrors={[]}
        detected={[]}
        varsJson="{}"
        setVarsJson={vi.fn()}
        onImportDetected={vi.fn()}
      />,
    );
    // The description field renders with its placeholder (value defaults to '').
    expect(screen.getByPlaceholderText('description')).toHaveValue('');
  });
});
