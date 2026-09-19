import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import WhatsAppBrowser from '@/pages/tools/whatsapp/WhatsAppBrowser';
import { ExtractionProvider } from '@/pages/tools/whatsapp/extraction';
import {
  WA_COMMUNITIES,
  WA_CONTACTS,
  WA_EXTRACTION,
  WA_GROUPS,
  WA_GROUP_MEMBERS,
  WA_START_EXTRACTION,
} from '@/pages/tools/whatsapp/whatsappQueries';
import { clearToken, setToken } from '@/lib/session';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { extractionJob } from './fixtures';

type PageInput = { search: string | null; page: number; page_size: number; community_jid?: string };

const firstPage: PageInput = { search: null, page: 1, page_size: 25 };

const pageMock = (
  query: MockedResponse['request']['query'],
  root: string,
  input: PageInput,
  items: Record<string, unknown>[],
  total = items.length,
): MockedResponse => ({
  request: { query, variables: { input } },
  result: { data: { [root]: { total, page: input.page, page_size: input.page_size, items } } },
  maxUsageCount: 10,
});

const community = { id: 'c1', community_jid: 'c1@g.us', name: 'Mumbai Foodies', groups_count: 4 };
const group = { id: 'g1', group_jid: 'g1@g.us', name: 'Bandra Brunch Club', community_jid: 'c1@g.us', members_count: 30 };
const contacts = [
  { id: 'u1', contact_jid: 'u1@c.us', phone: '919000000001', name: 'Ravi Kumar', push_name: 'Ravi', is_business: true },
  { id: 'u2', contact_jid: 'u2@c.us', phone: '919000000002', name: null, push_name: null, is_business: false },
];

const noJobMock = (uses = 10): MockedResponse => ({
  request: { query: WA_EXTRACTION },
  result: { data: { waExtraction: null } },
  maxUsageCount: uses,
});
const noJob = noJobMock();

const renderBrowser = (mocks: MockedResponse[], route = '/tools/whatsapp') =>
  renderWithApollo(
    <ExtractionProvider>
      <WhatsAppBrowser />
    </ExtractionProvider>,
    mocks,
    { route },
  );

beforeEach(() => {
  setToken('fixture-session');
});

afterEach(() => {
  clearToken();
});

describe('WhatsAppBrowser', () => {
  it('drills from a community into its groups and a group into its members', async () => {
    renderBrowser([
      noJob,
      pageMock(WA_COMMUNITIES, 'waCommunities', firstPage, [community]),
      pageMock(WA_GROUPS, 'waGroups', { ...firstPage, community_jid: 'c1@g.us' }, [group]),
      pageMock(WA_GROUPS, 'waGroups', firstPage, []),
      {
        request: { query: WA_GROUP_MEMBERS, variables: { group_jid: 'g1@g.us' } },
        result: {
          data: {
            waGroupMembers: [
              { jid: 'm1', phone: '919000000011', name: 'Asha Rao', is_business: false },
              { jid: 'm2', phone: '919000000012', name: '', is_business: true },
            ],
          },
        },
      },
    ]);

    expect(await screen.findByText('Mumbai Foodies')).toBeInTheDocument();
    expect(screen.getByText('4 groups')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mumbai Foodies'));
    expect(await screen.findByText('Bandra Brunch Club')).toBeInTheDocument();
    expect(screen.getByText('Community: Mumbai Foodies')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Groups' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByText('Bandra Brunch Club'));
    const dialog = within(await screen.findByRole('dialog', { name: 'Bandra Brunch Club' }));
    expect(await dialog.findByText('Asha Rao')).toBeInTheDocument();
    expect(dialog.getByText('+919000000012')).toBeInTheDocument();
    expect(dialog.getByText('+919000000012 · Business')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Clearing the community chip widens the list back to every group.
    fireEvent.click(within(screen.getByText('Community: Mumbai Foodies').parentElement as HTMLElement).getByTestId('CancelIcon'));
    expect(await screen.findByText('No data yet. Tap Extract to pull from WhatsApp.')).toBeInTheDocument();
    expect(screen.queryByText('Community: Mumbai Foodies')).toBeNull();
  });

  it('lists users by name, falling back to the number, and flags business accounts', async () => {
    renderBrowser([noJob, pageMock(WA_CONTACTS, 'waContacts', firstPage, contacts)], '/tools/whatsapp?selectedtab=users');

    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('+919000000001 · Business')).toBeInTheDocument();
    expect(screen.getAllByText('+919000000002')).toHaveLength(2);
  });

  it('searches server-side once typing settles', async () => {
    renderBrowser([
      noJob,
      pageMock(WA_COMMUNITIES, 'waCommunities', firstPage, [community]),
      pageMock(WA_COMMUNITIES, 'waCommunities', { ...firstPage, search: 'pune' }, [
        { id: 'c2', community_jid: 'c2@g.us', name: 'Pune Runners', groups_count: 2 },
      ]),
    ]);
    await screen.findByText('Mumbai Foodies');

    fireEvent.change(screen.getByLabelText('Search…'), { target: { value: '  pune ' } });

    expect(await screen.findByText('Pune Runners')).toBeInTheDocument();
  });

  it('pages through a long list and changes the page size', async () => {
    renderBrowser([
      noJob,
      pageMock(WA_COMMUNITIES, 'waCommunities', firstPage, [community], 60),
      pageMock(WA_COMMUNITIES, 'waCommunities', { ...firstPage, page: 2 }, [
        { id: 'c26', community_jid: 'c26@g.us', name: 'Delhi Readers', groups_count: 1 },
      ], 60),
      pageMock(WA_COMMUNITIES, 'waCommunities', { ...firstPage, page_size: 50 }, [community], 60),
    ]);
    await screen.findByText('Mumbai Foodies');

    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(await screen.findByText('Delhi Readers')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: '50' }));
    expect(await screen.findByText('Mumbai Foodies')).toBeInTheDocument();
  });

  it('starts an extraction and shows it running', async () => {
    renderBrowser([
      noJobMock(1),
      pageMock(WA_COMMUNITIES, 'waCommunities', firstPage, []),
      {
        request: { query: WA_START_EXTRACTION },
        result: { data: { waStartExtraction: extractionJob({ status: 'RUNNING' }) } },
      },
      {
        request: { query: WA_EXTRACTION },
        result: { data: { waExtraction: extractionJob({ status: 'RUNNING' }) } },
        maxUsageCount: 10,
      },
    ]);
    expect(await screen.findByText('No data yet. Tap Extract to pull from WhatsApp.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Extract' }));

    expect(await screen.findByRole('button', { name: 'Extracting…' })).toBeDisabled();
    expect(screen.getByText('Extraction in progress — data updates automatically.')).toBeInTheDocument();
    expect(screen.getByText('Extracting from WhatsApp…')).toBeInTheDocument();
  });
});
