import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import MjmlEditorPane from '@/pages/email-templates/MjmlEditorPane';

// Monaco types its change value as `string | undefined`; the stub can emit either.
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: Readonly<{ value: string; onChange: (next: string | undefined) => void }>) => (
    <>
      <textarea aria-label="MJML editor" value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => onChange(undefined)}>
        emit undefined
      </button>
    </>
  ),
}));

const renderPane = (onChange: (next: string) => void) =>
  render(
    <MockedProvider mocks={[]}>
      <MjmlEditorPane
        value="<mjml></mjml>"
        onChange={onChange}
        onValidate={vi.fn()}
        templateId="t1"
        images={[]}
        onImagesChange={vi.fn()}
      />
    </MockedProvider>,
  );

describe('MjmlEditorPane', () => {
  it('passes typed source straight through', () => {
    const onChange = vi.fn();
    renderPane(onChange);

    fireEvent.change(screen.getByLabelText('MJML editor'), { target: { value: '<mjml><mj-body /></mjml>' } });

    expect(onChange).toHaveBeenCalledWith('<mjml><mj-body /></mjml>');
  });

  it('turns an editor change without a value into an empty source', () => {
    const onChange = vi.fn();
    renderPane(onChange);

    fireEvent.click(screen.getByRole('button', { name: 'emit undefined' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
