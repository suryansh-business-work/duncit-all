import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { formatDateTime } from '@duncit/app-settings';
import UserLeadDetailPage from '@/pages/user-leads/UserLeadDetailPage';
import { WA_USER_LEAD } from '@/pages/tools/whatsapp/whatsappQueries';
import { renderWithApollo } from '../helpers/renderWithApollo';

interface WaUserLead {
  id: string;
  phone: string;
  name: string | null;
  contact_jid: string | null;
  source_account: string | null;
  source_communities: Array<{ jid: string; name: string | null }> | null;
  source_groups: Array<{ jid: string; name: string | null }> | null;
  imported_at: string | null;
}

const fullLead: WaUserLead = {
  id: 'l1',
  phone: '919876543210',
  name: 'Asha Rao',
  contact_jid: '919876543210@s.whatsapp.net',
  source_account: '919800000001',
  source_communities: [
    { jid: 'c1@g.us', name: 'Mumbai Foodies' },
    { jid: 'c2@g.us', name: null },
  ],
  source_groups: [
    { jid: 'g1@g.us', name: 'Weekend Treks' },
    { jid: 'g2@g.us', name: '' },
  ],
  imported_at: '2026-05-02T10:20:00.000Z',
};

const sparseLead: WaUserLead = {
  id: 'l1',
  phone: '919876543210',
  name: null,
  contact_jid: null,
  source_account: null,
  source_communities: null,
  source_groups: [],
  imported_at: null,
};

const leadMock = (result: MockedResponse['result']): MockedResponse => ({
  request: { query: WA_USER_LEAD, variables: { id: 'l1' } },
  result,
});

const renderPage = (result: MockedResponse['result']) =>
  renderWithApollo(<UserLeadDetailPage />, [leadMock(result)], {
    route: '/user-leads/l1',
    path: '/user-leads/:id',
  });

/** The value InfoRow prints next to `label`. */
const rowValue = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('UserLeadDetailPage', () => {
  it('shows the lead, its source account and every community and group it came from', async () => {
    renderPage({ data: { waUserLead: fullLead } });

    expect(await screen.findByRole('heading', { level: 2, name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
    expect(rowValue('Source WhatsApp account')).toBe('+919800000001');
    expect(rowValue('Imported')).toBe(formatDateTime('2026-05-02T10:20:00.000Z'));
    expect(rowValue('Contact JID')).toBe('919876543210@s.whatsapp.net');

    expect(screen.getByText('Communities (2)')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Foodies')).toBeInTheDocument();
    expect(screen.getByText('c2@g.us')).toBeInTheDocument();
    expect(screen.getByText('Groups (2)')).toBeInTheDocument();
    expect(screen.getByText('Weekend Treks')).toBeInTheDocument();
    expect(screen.getByText('g2@g.us')).toBeInTheDocument();
    expect(screen.queryByText('None')).toBeNull();
  });

  it('titles a nameless lead by its number and dashes or says None for everything it lacks', async () => {
    renderPage({ data: { waUserLead: sparseLead } });

    expect(await screen.findByRole('heading', { level: 2, name: '+919876543210' })).toBeInTheDocument();
    expect(rowValue('Source WhatsApp account')).toBe('—');
    expect(rowValue('Imported')).toBe('—');
    expect(rowValue('Contact JID')).toBe('—');
    expect(screen.getByText('Communities (0)')).toBeInTheDocument();
    expect(screen.getByText('Groups (0)')).toBeInTheDocument();
    expect(screen.getAllByText('None')).toHaveLength(2);
  });

  it('counts zero groups when the server sends no group list', async () => {
    renderPage({ data: { waUserLead: { ...fullLead, source_groups: null } } });

    expect(await screen.findByText('Groups (0)')).toBeInTheDocument();
    expect(screen.getByText('Communities (2)')).toBeInTheDocument();
    expect(screen.getAllByText('None')).toHaveLength(1);
  });

  it('warns when the lead does not exist', async () => {
    renderPage({ data: { waUserLead: null } });
    expect(await screen.findByText('Lead not found.')).toBeInTheDocument();
  });

  it('shows the query error instead of the lead', async () => {
    renderWithApollo(
      <UserLeadDetailPage />,
      [{ request: { query: WA_USER_LEAD, variables: { id: 'l1' } }, error: new Error('Network down') }],
      { route: '/user-leads/l1', path: '/user-leads/:id' },
    );
    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('goes back to the page the user came from', async () => {
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[leadMock({ data: { waUserLead: fullLead } })]}>
        <MemoryRouter initialEntries={['/user-leads', '/user-leads/l1']} initialIndex={1}>
          <Routes>
            <Route path="/user-leads" element={<p>Leads list</p>} />
            <Route path="/user-leads/:id" element={<UserLeadDetailPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    await screen.findByRole('heading', { level: 2, name: 'Asha Rao' });

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByText('Leads list')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Asha Rao' })).toBeNull();
  });
});
