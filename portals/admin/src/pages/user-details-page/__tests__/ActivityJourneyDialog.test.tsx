import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatTime } from '@duncit/app-settings';
import ActivityJourneyDialog from '../ActivityJourneyDialog';
import { USER_CLICKSTREAM } from '../queries';
import { renderWithProviders } from './testkit';

/**
 * The chart has its own suite (ActivityJourneyChart.test.tsx) and paints to a
 * canvas jsdom cannot back. The probe publishes which events the dialog handed
 * it, so the filtering is asserted on the exact set the chart would draw.
 */
vi.mock('../ActivityJourneyChart', () => ({
  default: ({ events }: Readonly<{ events: { id: string }[] }>) => (
    <div data-testid="journey-chart" data-ids={events.map((e) => e.id).join(',')} />
  ),
}));

const base = {
  __typename: 'ClickstreamEvent',
  target_tag: null,
  target_text: null,
  target_label: null,
  target_href: null,
  super_category_slug: null,
  checkout_url: null,
  metadata_json: '',
};

const events = [
  {
    ...base,
    id: 'e1',
    event_type: 'PAGE_VIEW',
    path: '/shop',
    title: 'Shop',
    super_category_slug: 'pets',
    metadata_json: JSON.stringify({ source: 'mweb', pointer: 'touch', viewport: '390x844' }),
    occurred_at: '2026-09-30T09:15:00.000Z',
  },
  {
    ...base,
    id: 'e2',
    event_type: 'CLICK',
    path: '/shop',
    title: 'Shop',
    target_label: 'Buy collar',
    target_href: 'https://ecomm.duncit.com/p/collar',
    metadata_json: 'not-json',
    occurred_at: '2026-09-30T09:16:00.000Z',
  },
  {
    ...base,
    id: 'e3',
    event_type: 'CLICK',
    path: '/pods',
    title: '',
    target_text: 'Join pod',
    occurred_at: '2026-09-30T10:00:00.000Z',
  },
  {
    ...base,
    id: 'e4',
    event_type: 'SCROLL',
    path: '',
    title: '',
    occurred_at: '2026-09-30T11:00:00.000Z',
  },
];

const VARS = { user_id: 'u1', date: '2026-09-30', limit: 500 };

const clickstreamMock = (rows: unknown[], fetches = { count: 0 }): MockedResponse => ({
  request: { query: USER_CLICKSTREAM, variables: VARS },
  result: () => {
    fetches.count += 1;
    return { data: { userClickstream: rows } };
  },
});

const renderDialog = (mocks: MockedResponse[], props: { open?: boolean; date?: string } = {}) =>
  renderWithProviders(
    <ActivityJourneyDialog open={props.open ?? true} userId="u1" date={props.date ?? '2026-09-30'} onClose={vi.fn()} />,
    { mocks },
  );

const chartIds = () => screen.getByTestId('journey-chart').getAttribute('data-ids');

const choose = (field: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: field }));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }));
};

describe('ActivityJourneyDialog — states', () => {
  it('shows a spinner while the day loads, then the empty notice for a day with no events', async () => {
    renderDialog([clickstreamMock([])]);

    expect(screen.getByText('User Journey · 2026-09-30')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('No clickstream events recorded for this day.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByTestId('journey-chart')).toBeNull();
  });

  it('shows the query error', async () => {
    renderDialog([{ request: { query: USER_CLICKSTREAM, variables: VARS }, error: new Error('Clickstream offline') }]);

    expect(await screen.findByText('Clickstream offline')).toBeInTheDocument();
    expect(screen.queryByText('No clickstream events recorded for this day.')).toBeNull();
  });

  it('does not fetch while closed', async () => {
    const fetches = { count: 0 };
    renderDialog([clickstreamMock(events, fetches)], { open: false });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetches.count).toBe(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ActivityJourneyDialog — the journey', () => {
  it('lists every event with its label, link, category and readable metadata', async () => {
    renderDialog([clickstreamMock(events)]);

    await screen.findByTestId('journey-chart');
    expect(chartIds()).toBe('e1,e2,e3,e4');

    // The headline falls back target_label → target_text → title → path.
    expect(screen.getByText('Buy collar')).toBeInTheDocument();
    expect(screen.getByText('Join pod')).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'https://ecomm.duncit.com/p/collar' })).toHaveAttribute(
      'href',
      'https://ecomm.duncit.com/p/collar',
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('pets')).toBeInTheDocument();
    // Parsed metadata is summarised; unparseable or empty metadata shows nothing.
    expect(screen.getByText('mweb · touch · 390x844')).toBeInTheDocument();
    expect(screen.queryByText('not-json')).toBeNull();
    expect(screen.getByText(formatTime('2026-09-30T10:00:00.000Z'))).toBeInTheDocument();
  });

  it('offers each page (untitled ones by name) and each action once, sorted', async () => {
    renderDialog([clickstreamMock(events)]);
    await screen.findByTestId('journey-chart');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Page' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All pages',
      '/pods',
      'Shop',
      'Untitled page',
    ]);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Action' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All actions',
      'CLICK',
      'PAGE_VIEW',
      'SCROLL',
    ]);
  });

  it('keeps an event with no recorded type in the journey but out of the action filter', async () => {
    renderDialog([
      clickstreamMock([events[0], { ...base, id: 'e9', event_type: null, path: '/home', title: 'Home', occurred_at: '2026-09-30T12:00:00.000Z' }]),
    ]);
    await screen.findByTestId('journey-chart');

    expect(chartIds()).toBe('e1,e9');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Action' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All actions',
      'PAGE_VIEW',
    ]);
  });

  it('narrows the journey by page and by action together', async () => {
    renderDialog([clickstreamMock(events)]);
    await screen.findByTestId('journey-chart');

    choose('Page', 'Shop');
    expect(chartIds()).toBe('e1,e2');
    expect(screen.queryByText('Join pod')).toBeNull();

    choose('Action', 'CLICK');
    expect(chartIds()).toBe('e2');
    expect(screen.getByText('Buy collar')).toBeInTheDocument();
    expect(screen.queryByText('mweb · touch · 390x844')).toBeNull();

    choose('Page', 'All pages');
    expect(chartIds()).toBe('e2,e3');
  });

  it('says so when no event matches the filters, and draws no chart', async () => {
    renderDialog([clickstreamMock(events)]);
    await screen.findByTestId('journey-chart');

    choose('Page', 'Untitled page');
    choose('Action', 'PAGE_VIEW');

    expect(screen.getByText('No events match the selected filters.')).toBeInTheDocument();
    expect(screen.queryByTestId('journey-chart')).toBeNull();
  });
});
