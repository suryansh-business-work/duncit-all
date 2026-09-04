import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

/** Monaco boots a web worker jsdom has no answer for; the textarea stands in. */
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v?: string) => void }) => (
    <textarea data-testid="monaco" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

/**
 * GrapesJS draws into a real iframe and measures it, which jsdom cannot do.
 * The canvas is faked at the module boundary so this file tests what the pane
 * is for — which editor is on screen and where its edits go — while
 * useGrapesMjml.test covers the wiring to the library itself.
 */
const grapesEdits: ((mjml: string) => void)[] = [];
vi.mock('../../src/pages/email-templates-page/MjmlDesignPane', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    grapesEdits.push(onChange);
    return (
      <div data-testid="designer">
        <span data-testid="designer-value">{value}</span>
      </div>
    );
  },
}));

vi.mock('../../src/components/MjmlAiButton', () => ({
  default: () => <button type="button">ai</button>,
}));

const MjmlEditorPane = (await import('../../src/pages/email-templates-page/MjmlEditorPane'))
  .default;

const MJML = '<mjml><mj-body><mj-text>Court 2</mj-text></mj-body></mjml>';

const mount = (over: Partial<React.ComponentProps<typeof MjmlEditorPane>> = {}) => {
  const onChange = vi.fn();
  const onValidate = vi.fn();
  render(
    <MjmlEditorPane value={MJML} onChange={onChange} onValidate={onValidate} {...over} />,
  );
  return { onChange, onValidate };
};

const designButton = () => screen.getByRole('button', { name: 'Design' });
const codeButton = () => screen.getByRole('button', { name: 'Code' });

beforeEach(() => {
  grapesEdits.length = 0;
});

describe('MjmlEditorPane', () => {
  it('opens on the source, with the actions that act on source', () => {
    mount();
    expect(screen.getByTestId('monaco')).toHaveValue(MJML);
    expect(screen.getByText('MJML source')).toBeInTheDocument();
    expect(codeButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('designer')).not.toBeInTheDocument();
  });

  it('forwards a source edit', () => {
    const { onChange } = mount();
    fireEvent.change(screen.getByTestId('monaco'), { target: { value: '<mjml/>' } });
    expect(onChange).toHaveBeenCalledWith('<mjml/>');
  });

  it('swaps the source for the designer, on the same MJML', async () => {
    mount();
    fireEvent.click(designButton());

    await waitFor(() => expect(screen.getByTestId('designer')).toBeInTheDocument());
    // The toggle changes the VIEW, never the format: the designer opens on the
    // very MJML the code pane was showing.
    expect(screen.getByTestId('designer-value')).toHaveTextContent(MJML);
    expect(screen.queryByTestId('monaco')).not.toBeInTheDocument();
    expect(screen.getByText('Visual designer')).toBeInTheDocument();
  });

  it('sends a designer edit to the same handler the source uses', async () => {
    const { onChange } = mount();
    fireEvent.click(designButton());
    await waitFor(() => expect(grapesEdits).toHaveLength(1));

    grapesEdits[0]('<mjml>designed</mjml>');
    expect(onChange).toHaveBeenCalledWith('<mjml>designed</mjml>');
  });

  // Formatting, verifying and the AI rewrite all act on the text. The designer
  // writes well-formed MJML by construction, so they would be acting on
  // something nobody is looking at.
  it('hides the source-only actions while designing, and brings them back', async () => {
    const { onValidate } = mount();
    expect(screen.getByRole('button', { name: 'ai' })).toBeInTheDocument();

    fireEvent.click(designButton());
    await waitFor(() => expect(screen.getByTestId('designer')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'ai' })).not.toBeInTheDocument();

    fireEvent.click(codeButton());
    await waitFor(() => expect(screen.getByTestId('monaco')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'ai' })).toBeInTheDocument();
    expect(onValidate).not.toHaveBeenCalled();
  });

  it('verifies and formats the source from the code view', () => {
    const { onChange, onValidate } = mount({ value: '<mjml><mj-body/></mjml>' });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));
    expect(onValidate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /format/i }));
    expect(onChange).toHaveBeenCalled();
  });

  // A toggle group reports null when the pressed button is the one already on.
  // Without a guard that empties the editor entirely.
  it('keeps the current view when the active button is pressed again', () => {
    mount();
    fireEvent.click(codeButton());
    expect(screen.getByTestId('monaco')).toBeInTheDocument();
    expect(codeButton()).toHaveAttribute('aria-pressed', 'true');
  });
});
