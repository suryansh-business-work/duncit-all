import { beforeEach, describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import NavigationPage from '../../src/pages/website/navigation';
import {
  CREATE_NAV_ITEM,
  DELETE_NAV_ITEM,
  UPDATE_NAV_ITEM,
  WEBSITE_NAV_TABLE,
  type WebsiteNavItem,
} from '../../src/pages/website/navigation/queries';
import { renderWithProviders, tableMock } from './testkit';

const nav = (over: Partial<WebsiteNavItem>): WebsiteNavItem => ({
  id: 'n1',
  site: 'MAIN',
  area: 'FOOTER',
  group_label: 'About',
  label: 'Careers',
  url: '/careers',
  sort_order: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const rows = [
  nav({ id: 'a', label: 'Careers', group_label: 'About', is_active: true, created_at: '2026-01-01T00:00:00.000Z' }),
  nav({ id: 'b', label: 'Hidden Link', group_label: '', is_active: false, created_at: undefined }),
];

const mutate = (query: unknown, key: string) => ({
  request: { query: query as never },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { [key]: { id: 'a' } } },
});

const allMocks = [
  tableMock(WEBSITE_NAV_TABLE, 'websiteNavTable', rows),
  mutate(CREATE_NAV_ITEM, 'createWebsiteNavItem'),
  mutate(UPDATE_NAV_ITEM, 'updateWebsiteNavItem'),
  { ...mutate(DELETE_NAV_ITEM, 'deleteWebsiteNavItem'), result: { data: { deleteWebsiteNavItem: true } } },
];

beforeEach(() => {
  // Reveal the declared-hidden "Created" column so its valueGetter runs.
  localStorage.setItem('duncit-table-cols:website-nav', JSON.stringify({ created_at: false }));
});

describe('NavigationPage', () => {
  it('renders the site tabs and both nav rows', async () => {
    renderWithProviders(<NavigationPage />, { mocks: allMocks });
    expect(await screen.findByText('Website Navigation')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'duncit.com' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Careers')).toBeInTheDocument());
    expect(screen.getByText('Hidden Link')).toBeInTheDocument();
    // Status chip branches.
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('switches the active site tab', async () => {
    renderWithProviders(<NavigationPage />, { mocks: allMocks });
    await waitFor(() => expect(screen.getByText('Careers')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'ads.duncit.com' }));
    await waitFor(() => expect(screen.getByText('Careers')).toBeInTheDocument());
  });

  it('creates a new link through the add dialog', async () => {
    renderWithProviders(<NavigationPage />, { mocks: allMocks });
    await waitFor(() => expect(screen.getByText('Careers')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add link/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Label/), { target: { value: 'Pricing' } });
    fireEvent.change(within(dialog).getByLabelText(/URL/), { target: { value: '/pricing' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits an existing link', async () => {
    renderWithProviders(<NavigationPage />, { mocks: allMocks });
    await waitFor(() => expect(screen.getByText('Careers')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'edit' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit navigation link')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes a link after confirmation and cancels otherwise', async () => {
    renderWithProviders(<NavigationPage />, { mocks: allMocks });
    await waitFor(() => expect(screen.getByText('Careers')).toBeInTheDocument());

    // Cancel path.
    fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete this link?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Escape dismisses the confirm dialog (Dialog onClose → setConfirmDelete(null)).
    fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);
    dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Confirm path.
    fireEvent.click(screen.getAllByRole('button', { name: 'delete' })[0]);
    dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
