import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import EmailComposeFields from '@/components/compose/EmailComposeFields';
import VariablesValuesEditor from '@/components/email/VariablesValuesEditor';
import { TEMPLATES } from '@/api/emailTemplates.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { festiveGreeting } from './fixtures';

// The Tiptap editor is exercised by @duncit/rich-text's own suite; here it only
// has to hand back HTML the way the real input does, through `onChange`.
vi.mock('@duncit/rich-text', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/rich-text')>()),
  DuncitRichTextInput: ({ value, onChange }: Readonly<{ value: string; onChange: (html: string) => void }>) => (
    <textarea aria-label="Rich text body" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const templatesMock: MockedResponse = {
  request: { query: TEMPLATES },
  result: { data: { emailTemplates: [festiveGreeting] } },
  maxUsageCount: 5,
};

const renderFields = (defaultSubject = 'Partnering with Duncit') => {
  const onChange = vi.fn();
  const view = renderWithApollo(
    <EmailComposeFields
      entity="VENUE_LEAD"
      leadName="Meera"
      leadEmail="meera@grandhall.in"
      variableValues={{ venue_name: 'Grand Hall' }}
      defaultSubject={defaultSubject}
      onChange={onChange}
    />,
    [templatesMock],
  );
  return { onChange, view };
};

describe('EmailComposeFields', () => {
  it('starts in simple text and sends the message as escaped HTML with line breaks', () => {
    const { onChange } = renderFields();

    expect(onChange).toHaveBeenLastCalledWith({ subject: 'Partnering with Duncit', body: '', valid: false, attachments: [] });

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi <team> & co\nSee you' } });
    expect(onChange).toHaveBeenLastCalledWith({
      subject: 'Partnering with Duncit',
      body: 'Hi &lt;team&gt; &amp; co<br/>See you',
      valid: true,
      attachments: [],
    });

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '   ' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ valid: false }));
  });

  it('takes rich text once switched to it', () => {
    const { onChange } = renderFields();

    fireEvent.click(screen.getByRole('button', { name: 'Rich Text' }));
    expect(onChange).toHaveBeenLastCalledWith({ subject: 'Partnering with Duncit', body: '', valid: false, attachments: [] });

    fireEvent.change(screen.getByLabelText('Rich text body'), { target: { value: '<p>Hello <b>Meera</b></p>' } });
    expect(onChange).toHaveBeenLastCalledWith({
      subject: 'Partnering with Duncit',
      body: '<p>Hello <b>Meera</b></p>',
      valid: true,
      attachments: [],
    });
  });

  it('defers to the template picker, falling back to the default subject until one is chosen', async () => {
    const { onChange } = renderFields();

    fireEvent.click(screen.getByRole('button', { name: 'Template' }));

    expect(screen.queryByLabelText('Subject')).toBeNull();
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ subject: 'Partnering with Duncit', body: '', valid: false, attachments: [] }),
    );
    expect(await screen.findByText('Pick a saved template.')).toBeInTheDocument();
  });

  it('ignores a click on the mode that is already selected', () => {
    const { onChange } = renderFields();
    const calls = onChange.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Simple Text' }));

    expect(onChange).toHaveBeenCalledTimes(calls);
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('follows a new default subject from the parent', () => {
    const fields = (defaultSubject: string) => (
      <EmailComposeFields
        entity="VENUE_LEAD"
        leadName="Meera"
        leadEmail="meera@grandhall.in"
        variableValues={{}}
        defaultSubject={defaultSubject}
        onChange={vi.fn()}
      />
    );
    // Text mode needs no data, so the parent's re-render is simulated in place.
    const { rerender } = render(fields('Partnering with Duncit'));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Draft kept' } });

    rerender(fields('Follow-up on your venue'));

    expect(screen.getByLabelText('Subject')).toHaveValue('Follow-up on your venue');
    expect(screen.getByLabelText('Message')).toHaveValue('Draft kept');
  });
});

describe('VariablesValuesEditor', () => {
  it('shows a hint when nothing is declared, custom or default', () => {
    const { rerender } = render(<VariablesValuesEditor variables={[]} values={{}} onChange={vi.fn()} emptyHint="Declare a variable first." />);
    expect(screen.getByText('Declare a variable first.')).toBeInTheDocument();

    rerender(<VariablesValuesEditor variables={[]} values={{}} onChange={vi.fn()} />);
    expect(screen.getByText('No variables declared yet.')).toBeInTheDocument();
  });

  it('edits one value per variable, described or not', () => {
    const onChange = vi.fn();
    render(
      <VariablesValuesEditor
        variables={[{ key: 'venue_name', description: 'Venue display name' }, { key: 'city' }]}
        values={{ venue_name: 'Grand Hall' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('venue_name')).toHaveAttribute('placeholder', 'Venue display name');
    expect(screen.getByLabelText('city')).toHaveAttribute('placeholder', 'Value for {{ city }}');
    expect(screen.getByLabelText('city')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('city'), { target: { value: 'Pune' } });
    expect(onChange).toHaveBeenCalledWith({ venue_name: 'Grand Hall', city: 'Pune' });
  });
});
