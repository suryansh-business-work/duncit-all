import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Lead } from '@/features/leads/useLead';
import * as docs from '@/graphql/leadTabsB';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { WebsitePagesTab } from '../lead/tabs/WebsitePagesTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Lead › Website: scrape the lead's site into pages, fetch and read their content, delete pages. */

const request = gqlRequest as jest.Mock;
const SITE = 'https://grandhall.in';
const page = (over: Record<string, unknown>) => ({
  id: 'pg1',
  url: `${SITE}/`,
  title: null,
  status: 'DISCOVERED',
  content_text: null,
  content_chars: 0,
  error: null,
  ...over,
});
const PAGES = [
  page({}),
  page({
    id: 'pg2',
    url: `${SITE}/about`,
    title: 'About Grand Hall',
    status: 'FETCHED',
    content_text: 'Seats 300 guests.',
    content_chars: 1234,
  }),
  page({ id: 'pg3', url: `${SITE}/menu`, status: 'ERROR', error: 'HTTP 500' }),
];
const LEAD: Lead = {
  id: 'v1',
  name: 'Grand Hall',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Medium',
  assigned_to: null,
  next_follow_up_date: null,
  contacts: [],
  activity_log: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadWebsiteDocument) return { venue: { id: 'v1', website: SITE } };
    if (doc === docs.CrmAppWebsitePagesDocument) return { crmWebsitePages: PAGES };
    if (doc === docs.CrmAppScrapeWebsiteDocument)
      return { crmScrapeWebsitePages: { discovered: 3, saved: 3 } };
    if (doc === docs.CrmAppFetchWebsitePageDocument)
      return { crmFetchWebsitePageContent: { id: vars.id, status: 'FETCHED' } };
    if (doc === docs.CrmAppDeleteWebsitePageDocument) return { crmDeleteWebsitePage: true };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const renderTab = (kind: 'VENUE_LEAD' | 'HOST_LEAD' | 'CREATOR_LEAD' = 'VENUE_LEAD') =>
  renderWithTheme(<WebsitePagesTab kind={kind} id="v1" lead={LEAD} onChanged={jest.fn()} />);

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('WebsitePagesTab', () => {
  it('shows the website, how many pages are saved, and each page with its state and size', async () => {
    renderTab();
    expect(await screen.findByText('3 pages saved')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadWebsiteDocument)[0]?.[1]).toEqual({
      id: 'v1',
      venue: true,
      host: false,
    });
    expect(callsTo(docs.CrmAppWebsitePagesDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      lead_id: 'v1',
    });
    expect(screen.getByTestId('website-link')).toBeOnTheScreen();
    expect(screen.getByText('About Grand Hall')).toBeOnTheScreen();
    expect(screen.getByText('HTTP 500')).toBeOnTheScreen();
    expect(screen.getByText((1234).toLocaleString())).toBeOnTheScreen();
    expect(screen.getByText('Fetch all (2)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Re-fetch content')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Fetch content')).toHaveLength(2);
  });

  it('fetches one page, and every unread page one after another, carrying on past a failure', async () => {
    renderTab();
    await screen.findByText('3 pages saved');
    await act(async () => fireEvent.press(screen.getByTestId('website-fetch-pg1')));
    expect(callsTo(docs.CrmAppFetchWebsitePageDocument)[0]?.[1]).toEqual({ id: 'pg1' });

    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppFetchWebsitePageDocument,
          (vars) =>
            vars.id === 'pg1'
              ? Promise.reject(new Error('Robots disallow'))
              : { crmFetchWebsitePageContent: { id: 'pg3', status: 'FETCHED' } },
        ],
      ]),
    );
    await act(async () => fireEvent.press(screen.getByTestId('website-fetch-all')));
    expect(
      callsTo(docs.CrmAppFetchWebsitePageDocument)
        .slice(1)
        .map(([, vars]) => vars),
    ).toEqual([{ id: 'pg1' }, { id: 'pg3' }]);
    expect(await screen.findByText('Robots disallow')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('website-error-close'));
    expect(screen.queryByText('Robots disallow')).toBeNull();
  });

  it('scrapes pages: a limit from 1 to 200, and the refusal kept in the sheet', async () => {
    renderTab();
    await screen.findByText('3 pages saved');
    fireEvent.press(screen.getByTestId('website-scrape'));
    expect(
      screen.getByText(
        `Discovers pages from ${SITE} (sitemap first, then homepage links) and saves them.`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('website-scrape-limit').props.value).toBe('20');
    fireEvent.changeText(screen.getByTestId('website-scrape-limit'), '500');
    await act(async () => fireEvent.press(screen.getByTestId('website-scrape-submit')));
    expect(screen.getByText('Enter a number from 1 to 200.')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppScrapeWebsiteDocument)).toHaveLength(0);

    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppScrapeWebsiteDocument,
          () => Promise.reject(new Error('Site blocked the crawler')),
        ],
      ]),
    );
    fireEvent.changeText(screen.getByTestId('website-scrape-limit'), '50');
    await act(async () => fireEvent.press(screen.getByTestId('website-scrape-submit')));
    expect(callsTo(docs.CrmAppScrapeWebsiteDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      lead_id: 'v1',
      limit: 50,
    });
    expect(await screen.findAllByText('Site blocked the crawler')).not.toHaveLength(0);
    expect(screen.getByTestId('website-scrape-sheet')).toBeOnTheScreen();

    serve();
    await act(async () => fireEvent.press(screen.getByTestId('website-scrape-submit')));
    await waitFor(() => expect(screen.queryByTestId('website-scrape-sheet')).toBeNull());
  });

  it('reads a page’s content, and deletes a page only after confirming', async () => {
    renderTab();
    await screen.findByText('3 pages saved');
    fireEvent.press(screen.getByTestId('website-view-pg2'));
    expect(screen.getByText('Seats 300 guests.')).toBeOnTheScreen();
    expect(screen.getByText(`${(1234).toLocaleString()} characters extracted`)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('website-content-close'));
    expect(screen.queryByText('Seats 300 guests.')).toBeNull();

    fireEvent.press(screen.getByTestId('website-delete-pg3'));
    expect(screen.getByText(`Remove "${SITE}/menu" from the saved pages?`)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('website-delete-cancel'));
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDeleteWebsitePageDocument, () => Promise.reject(new Error('Page is locked'))],
      ]),
    );
    fireEvent.press(screen.getByTestId('website-delete-pg3'));
    await act(async () => fireEvent.press(screen.getByTestId('website-delete-confirm')));
    expect(callsTo(docs.CrmAppDeleteWebsitePageDocument)[0]?.[1]).toEqual({ id: 'pg3' });
    expect(await screen.findByText('Page is locked')).toBeOnTheScreen();
  });

  it('says when the lead has no website, no pages yet, or pages that cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppWebsitePagesDocument, () => ({ crmWebsitePages: [] })],
      ]),
    );
    renderTab();
    expect(
      await screen.findByText(
        'No pages yet. Click "Scrape pages" to discover and save this website\'s pages.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('0 pages saved')).toBeOnTheScreen();

    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadWebsiteDocument, () => ({ host: { id: 'v1', website: '' } })],
      ]),
    );
    renderTab('HOST_LEAD');
    expect(
      await screen.findByText(
        'No website on record for this lead. Open Edit and add a website to scrape its pages.',
      ),
    ).toBeOnTheScreen();
  });

  it('retries a lead that could not be read, and has no Website tab for other kinds', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadWebsiteDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderTab();
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    serve();
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByText('3 pages saved')).toBeOnTheScreen();

    const calls = request.mock.calls.length;
    const other = renderTab('CREATOR_LEAD');
    expect(other.queryByTestId('website-tab')).toBeNull();
    expect(request.mock.calls).toHaveLength(calls);
  });
});
