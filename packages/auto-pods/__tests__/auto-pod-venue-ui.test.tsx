/**
 * The venue side of the queue, and the admin's dependency line.
 *
 * The venue picker decides what the queue shows (that venue's category and
 * city), the expiry note counts the offer down off the venue's list, and the
 * timeline draws the same enrolment derivation as the card's chips — one dot
 * per needed role, green where a partner has enrolled, amber where the offer
 * is still waiting.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, type AutoPodRow } from '@duncit/utils';
import { describe, expect, it, vi } from 'vitest';

import { AutoPodDependencyTimeline } from '../src/AutoPodDependencyTimeline';
import { AutoPodExpiryNote } from '../src/AutoPodExpiryNote';
import { MY_VENUES_FOR_AUTO_POD } from '../src/queries';
import { AutoPodVenuePicker, venueCategoryPath, type AutoPodVenueOption } from '../src/venue/AutoPodVenuePicker';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const labels = mwebAutoPodLabels(t);

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const venue = (over: Partial<AutoPodVenueOption> & Record<string, unknown> = {}): AutoPodVenueOption =>
  ({
    __typename: 'Venue',
    id: 'v-1',
    venue_name: 'Indiranagar Court',
    status: 'APPROVED',
    is_active: true,
    location_id: 'loc-blr',
    city: 'Bengaluru',
    venue_category: {
      __typename: 'VenueCategory',
      sub_category_id: 'sub-1',
      super_category_name: 'Sports',
      category_name: 'Racket',
      sub_category_name: 'Badminton',
    },
    ...over,
  }) as AutoPodVenueOption;

const venuesMock = (venues: readonly AutoPodVenueOption[]): MockedResponse => ({
  request: { query: MY_VENUES_FOR_AUTO_POD },
  result: { data: { myVenues: venues } },
});

const wrap = (ui: React.ReactNode, mocks: MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );

describe('venueCategoryPath', () => {
  it('joins the three names, skipping blanks, and is empty with no category', () => {
    expect(venueCategoryPath(venue())).toBe('Sports › Racket › Badminton');
    expect(
      venueCategoryPath(
        venue({ venue_category: { sub_category_id: 's', super_category_name: 'Sports', category_name: '', sub_category_name: 'Badminton' } }),
      ),
    ).toBe('Sports › Badminton');
    expect(venueCategoryPath(venue({ venue_category: null }))).toBe('');
    expect(venueCategoryPath(null)).toBe('');
  });
});

describe('AutoPodVenuePicker', () => {
  it('chooses the first approved, active venue on arrival and names its category', async () => {
    const onChange = vi.fn();
    wrap(<AutoPodVenuePicker value={null} onChange={onChange} labels={labels} />, [
      venuesMock([
        venue({ id: 'v-0', venue_name: 'Pending Hall', status: 'PENDING' }),
        venue({ id: 'v-9', venue_name: 'Paused Hall', is_active: false }),
        venue(),
      ]),
    ]);
    await settle();
    await settle();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-1' }));
  });

  it('writes the chosen venue back and shows the category under the picker', async () => {
    const onChange = vi.fn();
    const chosen = venue();
    wrap(<AutoPodVenuePicker value={chosen} onChange={onChange} labels={labels} />, [
      venuesMock([chosen, venue({ id: 'v-2', venue_name: 'Koramangala Court' })]),
    ]);
    await settle();
    await settle();
    expect(screen.getByText(labels.venueCategory('Sports › Racket › Badminton'))).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText(labels.venueLabel));
    await settle();
    fireEvent.click(await screen.findByRole('option', { name: 'Koramangala Court' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-2' }));
  });

  it('warns when the chosen venue declares no category — it will be offered nothing', async () => {
    const chosen = venue({ venue_category: null });
    wrap(<AutoPodVenuePicker value={chosen} onChange={vi.fn()} labels={labels} />, [venuesMock([chosen])]);
    await settle();
    await settle();
    expect(screen.getByText(labels.noVenueCategory)).toBeInTheDocument();
  });

  it('says so when the owner has no approved venue at all', async () => {
    wrap(<AutoPodVenuePicker value={null} onChange={vi.fn()} labels={labels} />, [venuesMock([])]);
    await settle();
    await settle();
    expect(screen.getByText(labels.noVenues)).toBeInTheDocument();
  });
});

describe('AutoPodExpiryNote', () => {
  const now = Date.UTC(2026, 8, 2, 10, 0, 0);

  it('counts the offer down off the venue list', () => {
    const expiresAt = new Date(now + 5 * 3_600_000 + 12 * 60_000).toISOString();
    render(<AutoPodExpiryNote expiresAt={expiresAt} nowMs={now} labels={labels} />);
    expect(screen.getByTestId('auto-pod-expiry')).toHaveTextContent(labels.removedIn(5, 12));
  });

  it('draws nothing without a deadline, or once it has passed', () => {
    const { container, rerender } = render(<AutoPodExpiryNote expiresAt={null} nowMs={now} labels={labels} />);
    expect(container.innerHTML).toBe('');
    rerender(<AutoPodExpiryNote expiresAt={new Date(now - 1).toISOString()} nowMs={now} labels={labels} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('AutoPodDependencyTimeline', () => {
  const row = (over: Partial<AutoPodRow> = {}): Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim' | 'pod_mode'> => ({
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    ...over,
  });

  it('draws Venue → Host → Club Admin, amber while waiting and green with the enrolled name', () => {
    render(
      <AutoPodDependencyTimeline
        row={row({ host_claim: { user_id: 'h1', host_name: 'Asha Rao', assigned_at: '2026-09-01T00:00:00.000Z' } })}
        labels={labels}
      />,
    );
    const timeline = screen.getByTestId('auto-pod-dependency');
    expect(timeline).toHaveTextContent(labels.tick('venue'));
    expect(timeline).toHaveTextContent(labels.tick('host'));
    expect(timeline).toHaveTextContent(labels.tick('club'));
    expect(timeline).toHaveTextContent('Asha Rao');
    expect(screen.getAllByText(labels.tickPending)).toHaveLength(2);
    expect(screen.getByLabelText(`${labels.tick('host')} — ${labels.tickDone}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${labels.tick('venue')} — ${labels.tickPending}`)).toBeInTheDocument();
  });

  it('turns the green venue dot into a button when told what to open, and leaves an amber one alone', () => {
    const onVenueClick = vi.fn();
    const venue = {
      venue_id: 'v1',
      venue_slot_id: 's1',
      owner_user_id: 'o1',
      venue_name: 'Play Arena',
      pod_date_time: '2026-09-06T07:00:00.000Z',
      pod_end_date_time: null,
      slot_price: 1200,
      accepted_at: '2026-09-01T00:00:00.000Z',
    };
    const { unmount } = render(
      <AutoPodDependencyTimeline row={row({ venue_claim: venue })} labels={labels} onVenueClick={onVenueClick} />,
    );
    fireEvent.click(screen.getByTestId('auto-pod-dependency-venue'));
    expect(onVenueClick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(`${labels.tick('venue')} — ${labels.tickDone}`).tagName).toBe('BUTTON');
    expect(screen.getByTestId('auto-pod-dependency-venue')).toHaveTextContent('Play Arena');
    unmount();

    render(<AutoPodDependencyTimeline row={row()} labels={labels} onVenueClick={onVenueClick} />);
    expect(screen.queryByTestId('auto-pod-dependency-venue')).toBeNull();
    expect(screen.getByLabelText(`${labels.tick('venue')} — ${labels.tickPending}`).tagName).toBe('SPAN');
  });

  it('falls back to the "enrolled" word when a claim carries no name', () => {
    render(
      <AutoPodDependencyTimeline
        row={row({ club_claim: { club_id: 'c1', club_name: '', user_id: 'u1', claimed_at: '2026-09-01T00:00:00.000Z' } })}
        labels={labels}
      />,
    );
    expect(screen.getByText(labels.tickDone)).toBeInTheDocument();
  });

  it('is a two-stop line for a virtual offer, which waits on no venue', () => {
    render(<AutoPodDependencyTimeline row={row({ pod_mode: 'VIRTUAL' })} labels={labels} />);
    const timeline = screen.getByTestId('auto-pod-dependency');
    expect(timeline).not.toHaveTextContent(labels.tick('venue'));
    expect(screen.getAllByText(labels.tickPending)).toHaveLength(2);
  });
});

describe('AutoPodDependencyTimeline / an enrolled venue', () => {
  it('names the venue that accepted', () => {
    render(
      <AutoPodDependencyTimeline
        row={{
          venue_claim: {
            venue_id: 'v-1',
            venue_slot_id: 's-1',
            owner_user_id: 'o-1',
            venue_name: 'Play Arena',
            pod_date_time: '2026-09-06T07:00:00.000Z',
            pod_end_date_time: null,
            slot_price: 1200,
            accepted_at: '2026-08-27T10:12:00.000Z',
          },
          host_claim: null,
          club_claim: null,
        }}
        labels={labels}
      />,
    );
    expect(screen.getByText('Play Arena')).toBeInTheDocument();
  });
});
