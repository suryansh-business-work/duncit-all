import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import WebsitePagesTab from '@/components/website-pages-tab';
import PageContentDialog from '@/components/website-pages-tab/PageContentDialog';
import ScrapeDialog from '@/components/website-pages-tab/ScrapeDialog';
import {
  CRM_WEBSITE_PAGES,
  DELETE_CRM_WEBSITE_PAGE,
  FETCH_CRM_WEBSITE_PAGE_CONTENT,
  SCRAPE_CRM_WEBSITE_PAGES,
  type CrmWebsitePage,
} from '@/api/websitePages.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const VARS = { entity_type: 'VENUE_LEAD', lead_id: 'lead-7' };
const SITE = 'https://grandhall.in';

const page = (overrides: Partial<CrmWebsitePage>): CrmWebsitePage => ({
  id: 'pg-1',
  entity_type: 'VENUE_LEAD',
  lead_id: 'lead-7',
  url: `${SITE}/`,
  title: null,
  status: 'DISCOVERED',
  http_status: null,
  content_text: null,
  content_chars: 0,
  error: null,
  fetched_at: null,
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-01T10:00:00.000Z',
  ...overrides,
});

const discovered = page({ id: 'pg-1', url: `${SITE}/` });
const fetched = page({
  id: 'pg-2',
  url: `${SITE}/about`,
  title: 'About Grand Hall',
  status: 'FETCHED',
  http_status: 200,
  content_text: 'Grand Hall seats 300 guests.',
  content_chars: 1234,
  fetched_at: '2026-09-02T10:00:00.000Z',
});
const failed = page({ id: 'pg-3', url: `${SITE}/menu`, status: 'ERROR', http_status: 500, error: 'HTTP 500' });

const listMock = (pages: CrmWebsitePage[], uses = 5): MockedResponse => ({
  request: { query: CRM_WEBSITE_PAGES, variables: VARS },
  result: { data: { crmWebsitePages: pages } },
  maxUsageCount: uses,
});

const fetchMock = (id: string, error?: Error): MockedResponse => ({
  request: { query: FETCH_CRM_WEBSITE_PAGE_CONTENT, variables: { id } },
  ...(error
    ? { error }
    : { result: { data: { crmFetchWebsitePageContent: page({ id, status: 'FETCHED', content_text: 'x', content_chars: 1 }) } } }),
});

const renderTab = (mocks: MockedResponse[], website: string | null = SITE) =>
  renderWithApollo(<WebsitePagesTab entity="VENUE_LEAD" leadId="lead-7" website={website} />, mocks);

describe('WebsitePagesTab', () => {
  it('asks for a website before anything can be scraped', () => {
    renderTab([listMock([])], null);
    expect(screen.getByText(/No website on record for this lead/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scrape pages' })).toBeNull();
  });

  it('shows the empty state once the lead has no saved pages', async () => {
    renderTab([listMock([])]);
    expect(await screen.findByText(/No pages yet/)).toBeInTheDocument();
    expect(screen.getByText('0 pages saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fetch all (0)' })).toBeDisabled();
    expect(screen.getByRole('link', { name: SITE })).toHaveAttribute('href', SITE);
  });

  it('lists every saved page with its status, error and extracted size', async () => {
    renderTab([listMock([discovered, fetched, failed])]);

    expect(await screen.findByText('3 pages saved')).toBeInTheDocument();
    expect(screen.getByText('About Grand Hall')).toBeInTheDocument();
    expect(screen.getByText('HTTP 500')).toBeInTheDocument();
    expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Fetch all (2)' })).toBeEnabled();
    // A fetched page offers a re-fetch; the others a first fetch.
    expect(screen.getAllByTestId('RefreshIcon')).toHaveLength(1);
    expect(screen.getAllByTestId('DownloadIcon').length).toBeGreaterThanOrEqual(2);
  });

  it('uses the singular when exactly one page is saved', async () => {
    renderTab([listMock([fetched])]);
    expect(await screen.findByText('1 page saved')).toBeInTheDocument();
  });

  it('shows the list error when the pages query fails', async () => {
    renderTab([{ request: { query: CRM_WEBSITE_PAGES, variables: VARS }, error: new Error('Pages unavailable') }]);
    expect(await screen.findByText('Pages unavailable')).toBeInTheDocument();
  });

  it('scrapes the requested number of pages and closes the dialog', async () => {
    const scrape = vi.fn(() => ({ data: { crmScrapeWebsitePages: { discovered: 1, saved: 1, pages: [discovered] } } }));
    renderTab([
      listMock([]),
      { request: { query: SCRAPE_CRM_WEBSITE_PAGES, variables: { ...VARS, limit: 20 } }, result: scrape },
    ]);
    await screen.findByText(/No pages yet/);

    fireEvent.click(screen.getByRole('button', { name: 'Scrape pages' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Scrape website pages' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Scrape pages' }));

    await waitFor(() => expect(scrape).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Scrape website pages' })).toBeNull());
  });

  it('keeps the scrape dialog open and reports why a scrape failed', async () => {
    renderTab([
      listMock([]),
      { request: { query: SCRAPE_CRM_WEBSITE_PAGES, variables: { ...VARS, limit: 20 } }, error: new Error('Site blocked the crawler') },
    ]);
    await screen.findByText(/No pages yet/);

    fireEvent.click(screen.getByRole('button', { name: 'Scrape pages' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Scrape website pages' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Scrape pages' }));

    expect(await screen.findByText('Site blocked the crawler')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Scrape website pages' })).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Scrape website pages' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Site blocked the crawler')).toBeNull());
  });

  it('fetches every unfetched page in turn and reports a page that failed', async () => {
    renderTab([
      listMock([discovered, fetched, failed]),
      fetchMock('pg-1'),
      fetchMock('pg-3', new Error('Timed out reading the page')),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Fetch all (2)' }));

    expect(await screen.findByText(/Fetching \d\/2/)).toBeInTheDocument();
    expect(await screen.findByText('Timed out reading the page')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Fetching/)).toBeNull());
  });

  it('fetches one page from its row and surfaces a row failure', async () => {
    renderTab([listMock([discovered, failed]), fetchMock('pg-1'), fetchMock('pg-3', new Error('Robots disallow'))]);
    await screen.findByText('HTTP 500');
    const [first, second] = screen.getAllByRole('button', { name: 'Fetch content' });

    fireEvent.click(first);
    fireEvent.click(second);

    expect(await screen.findByText('Robots disallow')).toBeInTheDocument();
  });

  it('opens the extracted text of a fetched page and closes it again', async () => {
    renderTab([listMock([discovered, fetched])]);
    await screen.findByText('About Grand Hall');
    const viewButtons = screen.getAllByRole('button', { name: 'View content' });
    expect(viewButtons[0]).toBeDisabled();

    fireEvent.click(viewButtons[1]);
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Grand Hall seats 300 guests.')).toBeInTheDocument();
    expect(dialog.getByText(`${(1234).toLocaleString()} characters extracted`)).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: `${SITE}/about` })).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Grand Hall seats 300 guests.')).toBeNull());
  });

  it('deletes a page after confirmation', async () => {
    const remove = vi.fn(() => ({ data: { crmDeleteWebsitePage: true } }));
    renderTab([
      listMock([discovered]),
      { request: { query: DELETE_CRM_WEBSITE_PAGE, variables: { id: 'pg-1' } }, result: remove },
    ]);
    await screen.findByText('1 page saved');

    fireEvent.click(screen.getByRole('button', { name: 'Delete page' }));
    expect(await screen.findByText(`Remove "${SITE}/" from the saved pages?`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it('reports a failed delete and closes the confirmation', async () => {
    renderTab([
      listMock([discovered]),
      { request: { query: DELETE_CRM_WEBSITE_PAGE, variables: { id: 'pg-1' } }, error: new Error('Page is locked') },
    ]);
    await screen.findByText('1 page saved');

    fireEvent.click(screen.getByRole('button', { name: 'Delete page' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Page is locked')).toBeInTheDocument();
  });

  it('closes the delete confirmation on Cancel without deleting', async () => {
    renderTab([listMock([discovered])]);
    await screen.findByText('1 page saved');

    fireEvent.click(screen.getByRole('button', { name: 'Delete page' }));
    fireEvent.click(await screen.findByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(screen.queryByText(`Remove "${SITE}/" from the saved pages?`)).toBeNull());
  });
});

describe('PageContentDialog', () => {
  it('titles an untitled page generically', () => {
    renderWithApollo(<PageContentDialog page={{ ...fetched, title: null }} onClose={() => undefined} />);
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByText('Grand Hall seats 300 guests.')).toBeInTheDocument();
  });
});

describe('ScrapeDialog', () => {
  const renderDialog = (loading = false) => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderWithApollo(<ScrapeDialog open website={SITE} loading={loading} onClose={onClose} onConfirm={onConfirm} />);
    return { onConfirm, onClose };
  };

  it('refuses a page count outside 1-200 and accepts one inside it', () => {
    const { onConfirm } = renderDialog();
    const input = screen.getByLabelText('Max pages to discover');

    fireEvent.change(input, { target: { value: '500' } });
    expect(screen.getByText('Enter a number from 1 to 200.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scrape pages' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByText('Enter a number from 1 to 200.')).toBeNull();

    fireEvent.change(input, { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Scrape pages' }));
    expect(onConfirm).toHaveBeenCalledWith(35);
  });

  it('locks both actions while a scrape is running', () => {
    const { onClose } = renderDialog(true);
    expect(screen.getByRole('button', { name: 'Scraping…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
