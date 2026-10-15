import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PodLifecycleSettings from '../PodLifecycleSettings';

const NUMBER_FIELDS = [
  'draft_retention_days',
  'max_backout_attempts',
  'max_free_spot_cancellations',
  'venue_cancel_health_penalty',
  'pod_complete_timeout_hours',
  'pod_complete_reminder_hours',
  'pod_auto_cancel_lead_hours',
  'pod_cancel_risk_window_hours',
  'pod_cancel_risk_alert_hours',
  'ticket_discount_max_pct',
  'happening_nearby_days',
] as const;

const TOGGLE_FIELDS = [
  'attendance_otp_required',
  'pod_cancel_refund_hold',
  'pod_auto_cancel_enabled',
] as const;

const settings = {
  ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f, 5])),
  attendance_otp_required: false,
  pod_cancel_refund_hold: true,
  pod_auto_cancel_enabled: false,
};

describe('PodLifecycleSettings', () => {
  it.each(NUMBER_FIELDS.map((field, index) => [field, index] as const))(
    'saves a changed %s on its own and sends nothing else',
    async (field, index) => {
      const onSave = vi.fn(async () => undefined);
      render(<PodLifecycleSettings settings={settings} loading={false} onSave={onSave} />);

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs).toHaveLength(NUMBER_FIELDS.length);
      expect(inputs[index]).toHaveValue(5);

      fireEvent.change(inputs[index], { target: { value: '6' } });
      const saveButtons = screen.getAllByRole('button', { name: /^Save$/ });
      // Only the edited card becomes saveable.
      expect(saveButtons).toHaveLength(NUMBER_FIELDS.length);
      const enabled = saveButtons.filter((b) => !(b as HTMLButtonElement).disabled);
      expect(enabled).toEqual([saveButtons[index]]);
      fireEvent.click(enabled[0]);

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave).toHaveBeenCalledWith({ [field]: 6 });
    },
  );

  it.each(TOGGLE_FIELDS.map((field, index) => [field, index] as const))(
    'flips %s to the opposite of its saved value',
    async (field, index) => {
      const onSave = vi.fn(async () => undefined);
      render(<PodLifecycleSettings settings={settings} loading={false} onSave={onSave} />);

      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(TOGGLE_FIELDS.length);
      const saved = settings[field];
      expect(switches[index]).toHaveProperty('checked', saved);

      fireEvent.click(switches[index]);

      await waitFor(() => expect(onSave).toHaveBeenCalledWith({ [field]: !saved }));
      expect(onSave).toHaveBeenCalledTimes(1);
    },
  );

  it('leaves every number blank and nothing saveable before the settings arrive', () => {
    render(<PodLifecycleSettings settings={undefined} loading onSave={vi.fn()} />);
    for (const input of screen.getAllByRole('spinbutton')) {
      expect(input).toHaveValue(null);
    }
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
