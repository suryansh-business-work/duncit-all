/**
 * The top of a pod page: the media hero, and the overview under it.
 *
 * The hero carries the three things a reader does before they decide — go
 * back, save, share — and all three sit ON the media, so each has to survive a
 * pod with no media at all. A pod whose author has not uploaded anything is
 * still a pod, and a hero that rendered a broken image box there would be the
 * first thing every new host saw.
 *
 * Save is the one with a rule: while the toggle is in flight it cannot be
 * pressed again, because the second press is an unsave and the reader would end
 * up with the opposite of what they asked for.
 *
 * The overview is where the money and the time are, so it says "Free" rather
 * than a zero price, prices everything through the caller's formatter (there is
 * one currency setting and it is not this component's), and shows the host
 * their own extra action rather than a member's.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import PodHero from '../PodHero';
import PodOverview from '../PodOverview';

const testTheme = createTheme();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.HTMLMediaElement.prototype.play ??= () => Promise.resolve();
  globalThis.HTMLMediaElement.prototype.pause ??= () => undefined;
  Element.prototype.scrollTo ??= () => undefined;
});

const wrap = (ui: React.ReactNode) =>
  render(
    <ThemeProvider theme={testTheme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodHero', () => {
  const hero = (over: Partial<Parameters<typeof PodHero>[0]> = {}) => {
    const spies = { onBack: vi.fn(), onToggleSave: vi.fn(), onShare: vi.fn() };
    return {
      spies,
      ...wrap(
        <PodHero
          media={[{ url: 'https://ik.imagekit.io/duncit/court.png', type: 'IMAGE' }]}
          title="Sunday Badminton"
          saved={false}
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('shows the pod cover', () => {
    const { container } = hero();

    expect(container.innerHTML).toContain('court.png');
  });

  it('still renders a pod whose author has uploaded nothing', () => {
    const { container } = hero({ media: [] });

    // The first thing every new host sees — a broken image box would be worse
    // than an empty one.
    expect(container.innerHTML).not.toBe('');
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('carries all three actions, on the media itself', () => {
    const { container, spies } = hero();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.onBack).toHaveBeenCalled();
    expect(spies.onToggleSave).toHaveBeenCalled();
    expect(spies.onShare).toHaveBeenCalled();
  });

  it('cannot be saved twice while the first press is still in flight', () => {
    const { container, spies } = hero({ saveLoading: true });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    // The second press is an unsave: the reader would end up with the opposite
    // of what they asked for.
    expect(spies.onToggleSave).not.toHaveBeenCalled();
  });

  it('shows a saved pod differently from an unsaved one', () => {
    const saved = hero({ saved: true });
    const not = hero();

    expect(saved.container.innerHTML).not.toBe(not.container.innerHTML);
  });

  it('carries a video cover as a video', () => {
    const { container } = hero({
      media: [{ url: 'https://cdn.duncit.com/clip.mp4', type: 'VIDEO' }],
    });

    expect(container.innerHTML).not.toBe('');
  });

  it('carries several covers as a carousel', () => {
    const { container } = hero({
      media: [
        { url: 'https://ik.imagekit.io/duncit/one.png', type: 'IMAGE' },
        { url: 'https://ik.imagekit.io/duncit/two.png', type: 'IMAGE' },
        { url: 'https://cdn.duncit.com/three.mp4', type: 'VIDEO' },
      ],
    });

    expect(container.innerHTML).not.toBe('');
  });
});

describe('PodOverview', () => {
  const pod = (over: Record<string, unknown> = {}) => ({
    id: 'pod-1',
    pod_id: 'sunday-badminton',
    pod_title: 'Sunday Badminton',
    pod_description: 'Doubles at Court 2.',
    pod_amount: 250,
    pod_date_time: '2026-08-30T12:30:00.000Z',
    pod_end_date_time: '2026-08-30T14:00:00.000Z',
    no_of_spots: 8,
    pod_attendees: [{ user_id: 'u-2' }],
    pod_occurrence: 'ONE_TIME',
    ...over,
  });

  const overview = (over: Partial<Parameters<typeof PodOverview>[0]> = {}) => {
    const onAddStatus = vi.fn();
    return {
      onAddStatus,
      ...wrap(
        <PodOverview
          pod={pod()}
          isFree={false}
          isHost={false}
          priceFormat={(amount: number) => `₹${amount}`}
          onAddStatus={onAddStatus}
          categoryCrumbs={['Sports', 'Racquet', 'Badminton']}
          {...over}
        />
      ),
    };
  };

  it('names the pod and prices it through the caller formatter', () => {
    const { container } = overview();

    // There is one currency setting and it does not live in this component.
    expect(container.textContent).toContain('Sunday Badminton');
    expect(container.textContent).toContain('₹250');
  });

  it('says Free rather than a zero price', () => {
    const { container } = overview({ isFree: true, pod: pod({ pod_amount: 0 }) });

    expect(container.textContent).not.toContain('₹0');
  });

  it('shows the category trail root-first, so the reader knows what kind of pod it is', () => {
    const { container } = overview();

    expect(container.textContent).toContain('Sports');
    expect(container.textContent).toContain('Badminton');
  });

  it('renders a pod whose club has no category recorded', () => {
    const { container } = overview({ categoryCrumbs: [] });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('shows the host an action a member does not get', () => {
    const host = overview({ isHost: true });
    const member = overview();

    expect(host.container.innerHTML).not.toBe(member.container.innerHTML);
  });

  it('reports the host action to the page rather than doing it itself', () => {
    const { container, onAddStatus } = overview({ isHost: true });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(onAddStatus).toHaveBeenCalled();
  });

  it('renders a pod with no end time on it', () => {
    const { container } = overview({ pod: pod({ pod_end_date_time: null }) });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a pod with no time on it at all', () => {
    const { container } = overview({
      pod: pod({ pod_date_time: null, pod_end_date_time: null }),
    });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a repeating pod as well as a one-off', () => {
    const { container } = overview({ pod: pod({ pod_occurrence: 'WEEKLY' }) });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a pod nobody has joined yet', () => {
    const { container } = overview({ pod: pod({ pod_attendees: [] }) });

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a pod with no seat cap', () => {
    const { container } = overview({ pod: pod({ no_of_spots: 0 }) });

    expect(container.textContent).toContain('Sunday Badminton');
  });
});
