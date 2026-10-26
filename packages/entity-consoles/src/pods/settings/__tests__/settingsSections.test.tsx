import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AutoPodSettings from '../AutoPodSettings';
import PodReminderSettings from '../PodReminderSettings';
import RequestChangeSettings from '../RequestChangeSettings';
import VenueOfferCounterSettings from '../VenueOfferCounterSettings';
import type { PodSettingsSectionProps } from '../queries';

/**
 * Each section is a column of number cards, each saving exactly ONE setting. The
 * contract worth pinning is the wiring: card N shows setting N and saves ONLY
 * that setting — a swapped key would silently rewrite a different platform knob.
 */
interface Section {
  name: string;
  Component: ComponentType<PodSettingsSectionProps>;
  keys: string[];
}

const SECTIONS: Section[] = [
  {
    name: 'AutoPodSettings',
    Component: AutoPodSettings,
    keys: [
      'auto_pod_slot_window_days',
      'auto_pod_venue_expiry_hours',
      'auto_pod_assignment_expiry_hours',
      'auto_pod_cancel_health_penalty',
    ],
  },
  {
    name: 'PodReminderSettings',
    Component: PodReminderSettings,
    keys: [
      'pod_reminder_lead_hours',
      'pod_sameday_reminder_hours',
      'checkout_nudge_minutes',
      'venue_slot_reminder_lead_hours',
      'pod_feedback_delay_hours',
    ],
  },
  {
    name: 'RequestChangeSettings',
    Component: RequestChangeSettings,
    keys: [
      'venue_change_request_health_penalty',
      'host_change_request_health_penalty',
      'club_admin_change_request_health_penalty',
    ],
  },
  {
    name: 'VenueOfferCounterSettings',
    Component: VenueOfferCounterSettings,
    keys: ['venue_offer_max_counters'],
  },
];

// Every card gets a distinct saved value (index + 5) so a card wired to the
// wrong setting would show the wrong number.
const settingsFor = (keys: string[]) =>
  Object.fromEntries(keys.map((key, index) => [key, index + 5])) as unknown as NonNullable<
    PodSettingsSectionProps['settings']
  >;

describe.each(SECTIONS)('$name', ({ Component, keys }) => {
  it('shows each card its own saved setting, in order', () => {
    render(<Component settings={settingsFor(keys)} loading={false} onSave={vi.fn()} />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.map((input) => (input as HTMLInputElement).value)).toEqual(
      keys.map((_, index) => String(index + 5)),
    );
  });

  it('saves only the setting of the card whose Save was pressed', async () => {
    const onSave = vi.fn(async () => undefined);
    render(<Component settings={settingsFor(keys)} loading={false} onSave={onSave} />);

    const inputs = screen.getAllByRole('spinbutton');
    for (let index = 0; index < keys.length; index += 1) {
      const card = inputs[index].closest('.MuiCard-root') as HTMLElement;
      fireEvent.change(inputs[index], { target: { value: String(index + 8) } });
      fireEvent.click(within(card).getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(index + 1));
      expect(onSave).toHaveBeenLastCalledWith({ [keys[index]]: index + 8 });
    }
  });

  it('shows empty, unsaveable cards while the settings are still loading', () => {
    render(<Component settings={undefined} loading onSave={vi.fn()} />);
    for (const button of screen.getAllByRole('button', { name: 'Save' })) {
      expect(button).toBeDisabled();
    }
    for (const input of screen.getAllByRole('spinbutton')) {
      expect(input).toHaveValue(null);
    }
  });
});

// The total is split equally between the host and the venue, and the server keeps
// it even and within 2–20 — so the box refuses anything else instead of saving a
// number that would never apply.
describe('VenueOfferCounterSettings / its own bounds', () => {
  const INVALID = 'Enter an even number from 2 to 20 — it is split equally between the host and the venue.';
  const renderCounters = (onSave = vi.fn(async () => undefined)) => {
    render(<VenueOfferCounterSettings settings={{ venue_offer_max_counters: 6 }} loading={false} onSave={onSave} />);
    return { onSave, box: screen.getByRole('spinbutton', { name: 'Counters per booking (host + venue)' }) };
  };

  it('heads the group and states the range on the box', () => {
    const { box } = renderCounters();
    expect(screen.getByRole('heading', { name: 'Venue booking offers' })).toBeInTheDocument();
    expect(screen.getByText('Counter offers per booking')).toBeInTheDocument();
    expect(screen.getByText('An even number from 2 to 20. Default 6 (3 each).')).toBeInTheDocument();
    expect(box).toHaveValue(6);
    expect(box).toHaveAttribute('min', '2');
    expect(box).toHaveAttribute('max', '20');
    expect(box).toHaveAttribute('step', '2');
  });

  it.each(['5', '0', '22', '1'])('refuses %s and saves nothing', (value) => {
    const { box, onSave } = renderCounters();
    fireEvent.change(box, { target: { value } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText(INVALID)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the lowest and the highest total it allows', async () => {
    const { box, onSave } = renderCounters();
    fireEvent.change(box, { target: { value: '2' } });
    expect(screen.queryByText(INVALID)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({ venue_offer_max_counters: 2 }));

    fireEvent.change(box, { target: { value: '20' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith({ venue_offer_max_counters: 20 }));
  });
});
