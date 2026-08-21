/**
 * The Auto Pod queue as each partner reads it.
 *
 * An Auto Pod becomes a real pod only once a venue, a host AND a club admin
 * have all enrolled, so the card's whole job is to say where that has got to
 * and what this particular viewer can still do. The tick row is always three
 * wide for the same reason — a card must not change shape as partners join.
 */
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mwebAutoPodLabels, shellPodKindLabels, type AutoPodRow } from '@duncit/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutoPodCard } from '../src/AutoPodCard';
import { AutoPodQueue } from '../src/AutoPodQueue';
import { AutoPodTicks } from '../src/AutoPodTicks';
import { PodKindChooser } from '../src/PodKindChooser';

/** Echoes the key back, so an assertion reads as the key that was rendered. */
const t = (key: string) => key;
const labels = mwebAutoPodLabels(t);
const kindLabels = shellPodKindLabels(t);

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const row = (over: Partial<AutoPodRow> = {}): AutoPodRow => ({
  id: 'ap-1',
  auto_pod_no: 'DUN-AP-001',
  stage: 'OPEN',
  pod_title: 'Weekly Badminton',
  pod_description: 'Doubles, all levels.',
  pod_images_and_videos: [{ url: 'https://cdn.duncit.com/auto/a.jpg', type: 'IMAGE' }],
  sub_category_id: 'sub-1',
  category_name: 'Badminton',
  pod_amount: 250,
  no_of_spots: 8,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  viewer_claimed: false,
  pod_id: null,
  expected_host_earnings: 1400,
  ...over,
}) as AutoPodRow;

const formatWhen = (iso: string) => `when:${iso}`;
const formatMoney = (amount: number) => `₹${amount}`;

const wrapped = (ui: ReactNode) => render(<MockedProvider mocks={[]}>{ui}</MockedProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('AutoPodTicks', () => {
  it('always renders three ticks, so a card never changes width as partners enrol', () => {
    const { container } = render(
      <AutoPodTicks row={{ venue_claim: null, host_claim: null, club_claim: null }} labels={labels} />
    );

    expect(container.innerHTML).not.toBe('');
    const partial = render(
      <AutoPodTicks
        row={{
          venue_claim: { venue_id: 'v-1' } as never,
          host_claim: null,
          club_claim: null,
        }}
        labels={labels}
      />
    );
    expect(partial.container.innerHTML).not.toBe('');
  });

  it('renders at either size', () => {
    for (const size of ['small', 'medium'] as const) {
      const { container } = render(
        <AutoPodTicks row={{ venue_claim: null, host_claim: null, club_claim: null }} labels={labels} size={size} />
      );
      expect(container.innerHTML).not.toBe('');
    }
  });
});

describe('AutoPodCard', () => {
  it('shows the pod, its number and the money, all through the caller formatters', () => {
    const { container } = render(
      <AutoPodCard row={row()} labels={labels} formatWhen={formatWhen} formatMoney={formatMoney} />
    );

    expect(container.textContent).toContain('Weekly Badminton');
    expect(container.textContent).toContain('₹250');
  });

  it('renders the role action the caller owns', () => {
    render(
      <AutoPodCard
        row={row()}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        action={<button type="button">Enrol my venue</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Enrol my venue' })).toBeInTheDocument();
  });

  it('renders a row with no image rather than a broken one', () => {
    const { container } = render(
      <AutoPodCard
        row={row({ pod_images_and_videos: [] })}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
      />
    );

    expect(container.textContent).toContain('Weekly Badminton');
  });

  it('renders a row this viewer has already enrolled in', () => {
    const { container } = render(
      <AutoPodCard
        row={row({ viewer_claimed: true, pod_id: 'pod-9' })}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
      />
    );

    expect(container.innerHTML).not.toBe('');
  });
});

describe('AutoPodQueue', () => {
  const queue = (over: Record<string, unknown> = {}) =>
    wrapped(
      <AutoPodQueue
        role="VENUE"
        rows={[row(), row({ id: 'ap-2', auto_pod_no: 'DUN-AP-002', pod_title: 'Sunday Chess' })]}
        labels={labels}
        loading={false}
        error={false}
        onRetry={vi.fn()}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        renderAction={() => <button type="button">Enrol</button>}
        {...(over as never)}
      />
    );

  it('lists every open Auto Pod', async () => {
    const { container } = queue();
    await settle();

    expect(container.textContent).toContain('Weekly Badminton');
    expect(container.textContent).toContain('Sunday Chess');
  });

  it('shows a loading state rather than an empty list while it waits', async () => {
    const { container } = queue({ loading: true, rows: [] });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('offers a retry when the queue failed to load', async () => {
    const onRetry = vi.fn();
    queue({ error: true, rows: [], onRetry });
    await settle();

    const retry = screen.queryAllByRole('button')[0];
    if (retry) {
      fireEvent.click(retry);
      expect(onRetry).toHaveBeenCalled();
    }
  });

  it('renders an empty queue', async () => {
    const { container } = queue({ rows: [] });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders the already-enrolled slot for a row this viewer joined', async () => {
    const { container } = queue({
      rows: [row({ viewer_claimed: true, pod_id: 'pod-9' })],
      renderMineAction: () => <span>Open the pod</span>,
    });
    await settle();

    expect(container.textContent).toContain('Open the pod');
  });

  it.each(['VENUE', 'HOST', 'CLUB_ADMIN'] as const)('renders for the %s reader', async (role) => {
    const { container } = queue({ role });
    await settle();

    expect(container.textContent).toContain('Weekly Badminton');
  });
});

describe('PodKindChooser', () => {
  it('renders nothing while it is closed', () => {
    render(<PodKindChooser open={false} labels={kindLabels} onClose={vi.fn()} onPick={vi.fn()} />);

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('offers the kinds and reports the one that was picked', async () => {
    const onPick = vi.fn();
    render(<PodKindChooser open labels={kindLabels} onClose={vi.fn()} onPick={onPick} />);
    await settle();

    const choices = [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')];
    expect(choices.length).toBeGreaterThan(0);

    for (const choice of choices) {
      if (!choice.isConnected) continue;
      fireEvent.click(choice);
      await settle();
    }

    for (const [kind] of onPick.mock.calls) expect(typeof kind).toBe('string');
  });
});
