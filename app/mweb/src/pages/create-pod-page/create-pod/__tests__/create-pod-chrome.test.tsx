import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

import ClubAdminContactRow from '../ClubAdminContactRow';
import StepHero from '../StepHero';
import SlotPicker from '../SlotPicker';
import { POD_GUIDELINE_RULE_KEYS } from '../create-pod.form';
import type { CreatePodSlot } from '../create-pod.types';
import { fallbackT } from '../../../../i18n/fallback';

// The calendar is the shared @duncit/slots package's, with its own suite; here
// it only exposes what the picker handed it so the wrapper's mapping is read.
const calendar = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('@duncit/slots/mui', () => ({
  SlotCalendar: (props: Record<string, any>) => {
    calendar.props = props;
    return (
      <div data-testid="calendar-stub" data-selected={props.selectedSlotId} data-error={props.error ?? ''}>
        <button type="button" onClick={() => props.onPick({ id: 's2' })}>
          pick-s2
        </button>
        <button type="button" onClick={() => props.onPick({ id: 'ghost' })}>
          pick-ghost
        </button>
      </div>
    );
  },
}));

describe('ClubAdminContactRow', () => {
  it('shows a tappable chip for each channel the profile has', () => {
    render(
      <ClubAdminContactRow
        admin={{ id: 'a1', name: 'meera', phone: '+91 9000000001', whatsapp: '+91 90000 00002', email: 'meera@example.test' }}
      />,
    );
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByTestId('club-preview-admin-phone')).toHaveAttribute('href', 'tel:+91 9000000001');
    const wa = screen.getByTestId('club-preview-admin-whatsapp');
    expect(wa).toHaveAttribute('href', 'https://wa.me/919000000002');
    expect(wa).toHaveAttribute('target', '_blank');
    expect(wa).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId('club-preview-admin-email')).toHaveAttribute('href', 'mailto:meera@example.test');
  });

  it('omits channels the admin has not filled in, including a WhatsApp with no digits', () => {
    render(<ClubAdminContactRow admin={{ id: 'a2', name: 'Kabir', whatsapp: ' - ', email: null, phone: '' }} />);
    expect(screen.queryByTestId('club-preview-admin-phone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('club-preview-admin-whatsapp')).not.toBeInTheDocument();
    expect(screen.queryByTestId('club-preview-admin-email')).not.toBeInTheDocument();
    expect(screen.getByTestId('club-preview-admin')).toHaveTextContent('Kabir');
  });
});

describe('StepHero', () => {
  it('fills the progress pills up to the current step and names the step in the bar', () => {
    render(<StepHero step={1} total={5} title="Where and when" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(bar).toHaveAttribute('aria-label', fallbackT('mweb.createPod.stepCounter', { vars: { step: 2, total: 5 } }));
    expect(screen.getByRole('heading', { name: 'Where and when' })).toBeInTheDocument();
  });

  it('opens the guidelines dialog from the AI chip and closes it again', async () => {
    render(<StepHero step={0} total={5} title="Basics" />);
    expect(screen.queryByTestId('pod-guidelines-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('create-pod-ai-chip'));
    const dialog = await screen.findByTestId('pod-guidelines-dialog');
    // Every community rule is listed.
    POD_GUIDELINE_RULE_KEYS.forEach((key) => expect(dialog).toHaveTextContent(fallbackT(key)));
    fireEvent.click(screen.getByTestId('pod-guidelines-close'));
    await vi.waitFor(() => expect(screen.queryByTestId('pod-guidelines-dialog')).not.toBeInTheDocument());
  });
});

describe('SlotPicker', () => {
  const slot = (id: string): CreatePodSlot =>
    ({ id, start_at: '2026-07-04T10:00:00.000Z', end_at: '2026-07-04T12:00:00.000Z', whole_day: false, price: 500, extra: 'kept' }) as unknown as CreatePodSlot;

  it('hands the calendar only the fields it draws and reports the original slot on a pick', () => {
    const onPick = vi.fn();
    const slots = [slot('s1'), slot('s2')];
    render(
      <MockedProvider mocks={[]}>
        <SlotPicker slots={slots} loading={false} selectedSlotId="s1" onPick={onPick} required error="Pick a slot" />
      </MockedProvider>,
    );
    expect(calendar.props?.slots[0]).toEqual({
      id: 's1',
      start_at: '2026-07-04T10:00:00.000Z',
      end_at: '2026-07-04T12:00:00.000Z',
      whole_day: false,
      price: 500,
    });
    expect(screen.getByTestId('calendar-stub')).toHaveAttribute('data-selected', 's1');
    expect(screen.getByTestId('calendar-stub')).toHaveAttribute('data-error', 'Pick a slot');
    fireEvent.click(screen.getByText('pick-s2'));
    expect(onPick).toHaveBeenCalledWith(slots[1]);
  });

  it('ignores a pick that is not one of its slots', () => {
    const onPick = vi.fn();
    render(
      <MockedProvider mocks={[]}>
        <SlotPicker slots={[slot('s1')]} loading={false} selectedSlotId="" onPick={onPick} />
      </MockedProvider>,
    );
    fireEvent.click(screen.getByText('pick-ghost'));
    expect(onPick).not.toHaveBeenCalled();
  });
});
