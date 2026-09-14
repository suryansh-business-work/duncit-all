import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route } from 'react-router';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { RECORD_PODS_TABLE } from '../../../shared/recordPods';
import { ENTITY_CHANGE_LOGS_TABLE } from '../../../shared/change-logs/queries';
import { VENUE_DETAIL, type AdminVenueDetail } from '../queries';
import VenueDetailsPage from '../VenueDetailsPage';
import { makeVenue, missing } from './fixtures';

/** The fixture venue as the server sends it — every object carries its typename. */
const venuePayload = (venue: AdminVenueDetail) => {
  const { settings } = venue;
  return {
    ...venue,
    __typename: 'Venue',
    capacity_items: venue.capacity_items.map((item) => ({ ...item, __typename: 'VenueCapacityItem' })),
    venue_category: { ...venue.venue_category, __typename: 'VenueCategory' },
    bank_account: { ...venue.bank_account, __typename: 'VenueBankAccount' },
    settings: {
      ...settings,
      __typename: 'VenueSettings',
      operating_hours: { ...settings.operating_hours, __typename: 'VenueOperatingHours' },
      rules: { ...settings.rules, __typename: 'VenueRules' },
      auto_extend: { ...settings.auto_extend, __typename: 'VenueAutoExtend' },
      cancellation: {
        ...settings.cancellation,
        __typename: 'VenueCancellation',
        tiers: settings.cancellation.tiers.map((tier) => ({ ...tier, __typename: 'VenueCancellationTier' })),
        refund_tiers: settings.cancellation.refund_tiers.map((tier) => ({ ...tier, __typename: 'VenueRefundTier' })),
      },
    },
    documents: venue.documents?.map((doc) => ({ ...doc, __typename: 'VenueDocument' })) ?? null,
  };
};

const detailMock = (venue: AdminVenueDetail | null): MockedResponse => ({
  request: { query: VENUE_DETAIL, variables: { venue_doc_id: 'venue-1' } },
  result: { data: { venue: venue && venuePayload(venue) } },
});

type TableVariables = {
  entity_type?: string;
  entity_id?: string;
  query: { filters: { field: string; op: string; value: string | null }[] };
};

const renderPage = (mocks: MockedResponse[], path = '/venues/venue-1') =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [path],
    routes: (
      <>
        <Route path="/venues" element={<VenueDetailsPage />} />
        <Route path="/venues/:venueId" element={<VenueDetailsPage />} />
        <Route path="/pods/:podId" element={<div>POD RECORD ROUTE</div>} />
      </>
    ),
  });

/** Waits out the query and returns once the venue's header has drawn. */
const loaded = () => screen.findByRole('link', { name: 'Edit venue' });

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('VenueDetailsPage / reading the record', () => {
  it('waits on the venue, then heads the page with it and opens on the Overview tab', async () => {
    renderPage([detailMock(makeVenue())]);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await loaded()).toHaveAttribute('href', '/venues/venue-1/edit');

    expect(screen.getByText('The Board Room Cafe', { selector: 'h1, h2, h3, h4, h5, h6' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to venues' })).toHaveAttribute('href', '/venues');
    expect(screen.getByRole('link', { name: 'Open in Maps' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    for (const section of ['About', 'Location', 'Owner', 'Record']) {
      expect(screen.getByText(section, { selector: 'h6' })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Open Gallery 1' })).toBeInTheDocument();
  });

  it('names an untitled venue and reads an empty gallery and document list the record never filled', async () => {
    renderPage([
      detailMock(
        makeVenue({ venue_name: '', gallery: missing<string[]>(), documents: missing<AdminVenueDetail['documents']>() }),
      ),
    ]);
    await loaded();

    expect(screen.getByText('Untitled venue')).toBeInTheDocument();
    expect(screen.getByText('No gallery images.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Documents' }));
    expect(await screen.findByText('No documents uploaded.')).toBeInTheDocument();
  });

  it('warns when no venue exists for the id', async () => {
    renderPage([detailMock(null)]);

    expect(await screen.findByText('Venue not found.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit venue' })).not.toBeInTheDocument();
  });

  it('shows the server error when the venue cannot be read', async () => {
    renderPage([
      {
        request: { query: VENUE_DETAIL, variables: { venue_doc_id: 'venue-1' } },
        result: { errors: [new GraphQLError('You are not allowed to read this venue')] },
      },
    ]);

    expect(await screen.findByRole('alert')).toHaveTextContent('You are not allowed to read this venue');
  });

  it('asks for nothing without a venue id and reads as not found', async () => {
    renderPage([], '/venues');

    // No mock is registered: a query sent anyway would surface as an error alert.
    expect(await screen.findByRole('alert')).toHaveTextContent('Venue not found.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('VenueDetailsPage / tabs', () => {
  it('reads the booking hours, rules and cancellation policy on Operations', async () => {
    renderPage([detailMock(makeVenue())]);
    await loaded();

    fireEvent.click(screen.getByRole('tab', { name: 'Operations' }));

    expect(screen.getByRole('tab', { name: 'Operations' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Operating hours', { selector: 'h6' })).toBeInTheDocument();
    expect(screen.getByText('Within 24h — 50% of the slot price')).toBeInTheDocument();
    expect(screen.queryByText('About', { selector: 'h6' })).not.toBeInTheDocument();
  });

  it('lists the uploaded papers on Documents', async () => {
    renderPage([detailMock(makeVenue())]);
    await loaded();

    fireEvent.click(screen.getByRole('tab', { name: 'Documents' }));

    expect(await screen.findByText('GST Certificate')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', 'https://ik.imagekit.io/duncit/gst.pdf');
  });

  it("lists the pods booked at this venue on Pods, and a row opens the pod's record", async () => {
    let sent: TableVariables | undefined;
    renderPage([
      detailMock(makeVenue()),
      {
        request: {
          query: RECORD_PODS_TABLE,
          variables: (variables: TableVariables) => {
            sent = variables;
            return true;
          },
        },
        result: {
          data: {
            podsTable: {
              __typename: 'PodsTablePage',
              total: 1,
              rows: [
                {
                  __typename: 'Pod',
                  id: 'pod-4821',
                  pod_title: 'Sunday board games',
                  pod_date_time: '2026-10-04T12:30:00.000Z',
                  pod_mode: 'PHYSICAL',
                  no_of_spots: 12,
                  is_active: true,
                  venue_approval_status: 'APPROVED',
                  host_names: ['Asha Rao'],
                },
              ],
            },
          },
        },
      },
    ]);
    await loaded();

    fireEvent.click(screen.getByRole('tab', { name: 'Pods' }));

    expect(screen.getByText('Pods at this venue')).toBeInTheDocument();
    fireEvent.click(await screen.findByText('Sunday board games'));
    expect(sent?.query.filters).toEqual([{ field: 'venue_id', op: 'eq', value: 'venue-1', values: null }]);
    expect(await screen.findByText('POD RECORD ROUTE')).toBeInTheDocument();
  });

  it("reads this venue's own change history on Change Logs", async () => {
    let sent: TableVariables | undefined;
    renderPage([
      detailMock(makeVenue()),
      {
        request: {
          query: ENTITY_CHANGE_LOGS_TABLE,
          variables: (variables: TableVariables) => {
            sent = variables;
            return true;
          },
        },
        result: {
          data: {
            entityChangeLogsTable: { __typename: 'EntityChangeLogsPage', total: 0, page: 1, page_size: 25, rows: [] },
          },
        },
      },
    ]);
    await loaded();

    fireEvent.click(screen.getByRole('tab', { name: 'Change Logs' }));

    expect(await screen.findByText('No changes recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('Change logs')).toBeInTheDocument();
    expect(sent).toMatchObject({ entity_type: 'VENUE', entity_id: 'venue-1' });
  });
});
