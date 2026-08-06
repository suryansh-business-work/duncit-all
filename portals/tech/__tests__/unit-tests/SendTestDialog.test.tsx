import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import SendTestDialog from '../../src/pages/email-templates-page/SendTestDialog';
import { SEND_TEST, type Tpl } from '../../src/pages/email-templates-page/queries';

const template = {
  template_id: 't1',
  slug: 'welcome',
  name: 'Welcome',
  subject: 'Hi',
  mjml: '<mjml/>',
  fragment_key: 'transactional',
  footer_note: '',
  is_active: true,
  variables: [
    { key: 'name', sample: 'Asha' },
    { key: 'amount' },
  ],
} as unknown as Tpl;

/** Captures the variables the dialog actually sends. */
function mocksCapturing(sent: { vars?: string }) {
  return [
    {
      request: {
        query: SEND_TEST,
        variables: { id: 't1', to: 'ops@duncit.com', vars: JSON.stringify({ name: 'Suryansh', amount: '299', podId: '' }) },
      },
      result: () => {
        sent.vars = JSON.stringify({ name: 'Suryansh', amount: '299', podId: '' });
        return { data: { sendTestEmail: { __typename: 'EmailTestResult', ok: true, message: 'Test email sent' } } };
      },
      maxUsageCount: 3,
    },
  ];
}

const renderDialog = (mocks: any[] = [], onResult = vi.fn()) => {
  render(
    <MockedProvider mocks={mocks}>
      <SendTestDialog
        open
        template={template}
        detected={['name', 'podId', 't:email.common.greeting']}
        varsJson='{"name":"Asha"}'
        onClose={vi.fn()}
        onResult={onResult}
      />
    </MockedProvider>
  );
  return onResult;
};

describe('SendTestDialog', () => {
  it('offers a field for every variable the template uses', () => {
    renderDialog();
    // Declared on the template…
    expect(screen.getByLabelText('name')).toBeInTheDocument();
    expect(screen.getByLabelText('amount')).toBeInTheDocument();
    // …and one the MJML uses that nobody declared, which is the one most likely
    // to be missing a value.
    expect(screen.getByLabelText('podId')).toBeInTheDocument();
    expect(screen.getByText('Used in the MJML but not declared')).toBeInTheDocument();
  });

  it('leaves localization keys out — those are the send’s job, not an admin’s', () => {
    renderDialog();
    expect(screen.queryByLabelText('t:email.common.greeting')).not.toBeInTheDocument();
  });

  it('seeds from the Variables tab so the dialog starts where the editor left off', () => {
    renderDialog();
    expect(screen.getByLabelText('name')).toHaveValue('Asha');
  });

  it('sends exactly the values shown, and nothing else', async () => {
    const sent: { vars?: string } = {};
    renderDialog(mocksCapturing(sent));

    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: 'ops@duncit.com' } });
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Suryansh' } });
    fireEvent.change(screen.getByLabelText('amount'), { target: { value: '299' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(sent.vars).toBeDefined());
    const parsed = JSON.parse(sent.vars!);
    expect(parsed).toEqual({ name: 'Suryansh', amount: '299', podId: '' });
    // The stale Variables-tab blob is not forwarded wholesale.
    expect(Object.keys(parsed)).not.toContain('t:email.common.greeting');
  });

  it('says a template with no variables has nothing to fill', () => {
    render(
      <MockedProvider mocks={[]}>
        <SendTestDialog
          open
          template={{ ...template, variables: [] } as unknown as Tpl}
          detected={[]}
          varsJson="{}"
          onClose={vi.fn()}
          onResult={vi.fn()}
        />
      </MockedProvider>
    );
    expect(screen.getByText(/no variables/)).toBeInTheDocument();
  });
});
