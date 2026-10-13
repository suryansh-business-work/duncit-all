import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AutoPodSettings from '../AutoPodSettings';
import PodReminderSettings from '../PodReminderSettings';
import RequestChangeSettings from '../RequestChangeSettings';
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
    keys: ['pod_reminder_lead_hours', 'venue_slot_reminder_lead_hours', 'pod_feedback_delay_hours'],
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
