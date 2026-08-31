import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router-dom';
import EmailLogDrawer from '../../src/pages/email-logs-page/EmailLogDrawer';
import { EMAIL_LOG_ONE } from '../../src/pages/email-logs-page/queries';

const row = {
  __typename: 'EmailLog',
  id: 'L1',
  to: 'asha@example.com',
  cc: [],
  bcc: [],
  subject: 'Your spot was filled',
  template: 'pod-backout-spot-filled',
  fragment_key: 'transactional',
  category: 'transactional',
  status: 'SENT',
  reason: '',
  provider: 'smtp',
  message_id: 'm-1',
  source: 'SERVER',
  source_detail: '',
  duration_ms: 42,
  created_at: '2026-08-06T10:00:00.000Z',
  html: '<p>Hello Asha</p>',
  vars: '{"name":"Asha","amount":""}',
};

const mockFor = (data: Record<string, unknown> | null) => [
  {
    request: { query: EMAIL_LOG_ONE, variables: { id: 'L1' } },
    result: { data: { emailLog: data } },
    maxUsageCount: 5,
  },
];

const renderDrawer = (data: Record<string, unknown> | null = row, onClose = vi.fn()) => {
  render(
    <MemoryRouter>
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mockFor(data)}>
        <EmailLogDrawer logId="L1" onClose={onClose} />
      </MockedProvider>
    </MemoryRouter>
  );
  return onClose;
};

describe('EmailLogDrawer', () => {
  it('shows the email that was sent, not a re-render of the template', async () => {
    renderDrawer();
    // The subject is the drawer's title, and the body arrives as stored HTML.
    expect(await screen.findByText('Your spot was filled')).toBeInTheDocument();
    const frame = screen.getByTitle('Email preview') as HTMLIFrameElement;
    expect(frame.getAttribute('srcdoc')).toBe('<p>Hello Asha</p>');
  });

  it('links back to the template and the fragment it used', async () => {
    renderDrawer();
    const tpl = await screen.findByRole('link', { name: /pod-backout-spot-filled/ });
    expect(tpl).toHaveAttribute('href', '/emails/templates?slug=pod-backout-spot-filled');
    expect(screen.getByRole('link', { name: /transactional/ })).toHaveAttribute(
      'href',
      '/emails/fragments?key=transactional'
    );
  });

  it('lists the variables it was filled in with, empty ones included', async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole('tab', { name: 'Variables' }));
    expect(screen.getByText('{{name}}')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    // A variable that rendered blank is the whole reason someone opens this tab.
    expect(screen.getByText('{{amount}}')).toBeInTheDocument();
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('shows the raw HTML on its own tab', async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole('tab', { name: 'HTML' }));
    expect(screen.getByText('<p>Hello Asha</p>')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('says so when the attempt never produced a body', async () => {
    renderDrawer({ ...row, html: '', reason: 'Template "welcome" is not active', status: 'SKIPPED' });
    expect(await screen.findByText(/stopped before a body existed/)).toBeInTheDocument();
    // The reason is what the row was opened for.
    expect(screen.getByText('Template "welcome" is not active')).toBeInTheDocument();
  });

  it('reports a row that has since been deleted', async () => {
    renderDrawer(null);
    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
  });

  it('closes', async () => {
    const onClose = renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
