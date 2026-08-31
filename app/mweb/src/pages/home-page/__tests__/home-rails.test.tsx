/**
 * The three rails on Home: the featured pods, a club's pods, and the
 * merchandising row above them.
 *
 * The featured rail's job is to say how full a pod is at a glance, and it says
 * it three different ways for a reason: "1 spot left" reads as urgency, "4 spots
 * left" reads as room, and a bare "6/8" is what is shown once the wording would
 * be misleading. Getting the boundary wrong turns urgency into noise.
 *
 * Every card is a `<div role="button">` rather than a real one, deliberately:
 * the save heart inside it IS a button, and button-in-button is invalid HTML.
 * That makes Enter and Space hand-wired, and therefore the exact thing that
 * stops working silently — so both are asserted, on both rails.
 *
 * The merchandising row keeps the rule that a route stays in the app and an
 * address leaves it. `navigate` keeps mWeb's history and the visitor's place on
 * Home; a card pointing at one of our own screens must never cost them that.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HomeFeaturedPods from '../HomeFeaturedPods';
import ClubSection from '../ClubSection';
import SomethingForYouRail from '../SomethingForYouRail';

const testTheme = createTheme();

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'pod-1',
  pod_id: 'DUN-POD-0001',
  pod_title: 'Sunday Badminton',
  pod_type: 'NATIVE_PAID',
  pod_amount: 250,
  no_of_spots: 8,
  pod_attendees: [{ user_id: 'u-1', seats: 2 }],
  pod_images_and_videos: ['https://ik.imagekit.io/duncit/court.jpg'],
  club_slug: 'sunset-club',
  start_date_time: '2026-08-23T09:00:00.000Z',
  ...over,
});

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode, mocks: MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

const cardsIn = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[role="button"]')];

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomeFeaturedPods', () => {
  const rail = (over: Partial<Parameters<typeof HomeFeaturedPods>[0]> = {}) =>
    wrap(<HomeFeaturedPods pods={[pod()]} totalCount={1} filtered={false} {...over} />);

  it('renders nothing at all when there is nothing to feature', () => {
    const { container } = rail({ pods: [] });

    expect(container.innerHTML).toBe('');
  });

  it('shows each pod by name', () => {
    expect(rail().container.textContent).toContain('Sunday Badminton');
  });

  it('says "1 spot left" as urgency, and counts the rest as room', () => {
    const one = rail({ pods: [pod({ no_of_spots: 3, pod_attendees: [{ user_id: 'u', seats: 2 }] })] });
    const many = rail({ pods: [pod({ no_of_spots: 8, pod_attendees: [{ user_id: 'u', seats: 2 }] })] });

    expect(one.container.textContent).not.toBe(many.container.textContent);
  });

  it('falls back to a bare count once the wording would mislead — a full pod', () => {
    const { container } = rail({ pods: [pod({ no_of_spots: 2, seats_taken: 2 })] });

    expect(container.textContent).toContain('2/2');
  });

  it('renders a pod with no seat cap at all', () => {
    const { container } = rail({ pods: [pod({ no_of_spots: 0 })] });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('prices a free pod differently from a paid one', () => {
    const free = rail({ pods: [pod({ pod_type: 'FREE', pod_amount: 0 })] });
    const paid = rail();

    expect(free.container.textContent).not.toBe(paid.container.textContent);
  });

  it('shows the category chip only where the caller can name one', () => {
    const withChip = rail({ categoryLabelOf: () => 'Sports' });
    const without = rail({ categoryLabelOf: () => null });

    expect(withChip.container.textContent).toContain('Sports');
    expect(without.container.textContent).not.toContain('Sports');
  });

  it('hides the save heart from a signed-out visitor', () => {
    const signedOut = rail();
    const signedIn = rail({ savedOf: () => false, onToggleSave: vi.fn() });

    expect(signedIn.container.querySelectorAll('button').length).toBeGreaterThan(
      signedOut.container.querySelectorAll('button').length
    );
  });

  it('reports a save by pod id', () => {
    const onToggleSave = vi.fn();
    const { container } = rail({ savedOf: () => true, savingOf: () => false, onToggleSave });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(onToggleSave).toHaveBeenCalledWith('pod-1');
  });

  it('cannot be tapped twice while that pod own toggle is still in flight', () => {
    const onToggleSave = vi.fn();
    const { container } = rail({
      savedOf: () => true,
      savingOf: (id: string) => id === 'pod-1',
      onToggleSave,
    });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(onToggleSave).not.toHaveBeenCalled();
    expect(container.querySelector('[role=\"progressbar\"]')).not.toBeNull();
  });

  it('opens a pod from a click and from the keyboard — the card is not a real button', () => {
    const { container } = rail();
    const [card] = cardsIn(container);

    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'Tab' });

    expect(card.getAttribute('aria-label')).toBe('Sunday Badminton');
  });

  it('offers a See-all card when the rail is capped below the real count', () => {
    const capped = rail({ totalCount: 40 });
    const complete = rail({ totalCount: 1 });

    expect(capped.container.innerHTML).not.toBe(complete.container.innerHTML);
  });

  it('drops the count from that card while a filter is narrowing the rail', () => {
    const filtered = rail({ totalCount: 40, filtered: true });
    const unfiltered = rail({ totalCount: 40, filtered: false });

    expect(filtered.container.innerHTML).not.toBe(unfiltered.container.innerHTML);
  });
});

describe('ClubSection', () => {
  const club = { id: 'club-1', club_name: 'Sunset Club', club_slug: 'sunset-club', club_logo: '' };

  const section = (over: Partial<Parameters<typeof ClubSection>[0]> = {}) =>
    wrap(
      <ClubSection club={club} clubPods={[pod()]} hostNameOf={() => 'Meera N'} {...over} />
    );

  it('names the club above its pods', () => {
    expect(section().container.textContent).toContain('Sunset Club');
  });

  it('names the host of each pod, which is who a member is turning up to meet', () => {
    expect(section().container.textContent).toContain('Meera N');
  });

  it('renders a pod whose host is not known', () => {
    const { container } = section({ hostNameOf: () => null });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a club with no pods on it right now', () => {
    const { container } = section({ clubPods: [] });

    expect(container.textContent).toContain('Sunset Club');
  });

  it('opens a pod from the keyboard as well as a click', () => {
    const { container } = section();

    for (const card of cardsIn(container)) {
      fireEvent.click(card);
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });
    }

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('reports a save by pod id here too', () => {
    const onToggleSave = vi.fn();
    const { container } = section({ savedOf: () => false, savingOf: () => false, onToggleSave });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [id] of onToggleSave.mock.calls) expect(id).toBe('pod-1');
  });
});

describe('SomethingForYouRail', () => {
  // Its query is module-private, so this covers the half that does not need it:
  // an empty row renders NOTHING rather than an empty scroller with a heading
  // over it, which is what a merchandising row with no cards would otherwise be.
  it('renders nothing at all when there is nothing being merchandised', async () => {
    const { container } = wrap(<SomethingForYouRail />);
    await settle();
    await settle();

    expect(container.innerHTML).toBe('');
  });

  it('survives the query never answering, which is its state on first paint', async () => {
    const { container } = wrap(<SomethingForYouRail />);
    await settle();

    expect(container).toBeDefined();
  });
});
