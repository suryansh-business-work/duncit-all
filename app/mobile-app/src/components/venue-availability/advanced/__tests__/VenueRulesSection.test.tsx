import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { VenueRulesForm } from '@duncit/slots';

import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { VenueRulesSection } from '../VenueRulesSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const RULES: VenueRulesForm = {
  buffer_minutes: 15,
  min_notice_minutes: 60,
  max_advance_days: 30,
  max_bookings_per_slot: 2,
  allow_instant_booking: true,
  allow_waitlist: false,
  booking_approval_required: false,
  allow_multiple_bookings: true,
};

const mount = (rules: VenueRulesForm = RULES) => {
  const onSaved = jest.fn();
  renderWithProviders(<VenueRulesSection venueId="v1" rules={rules} onSaved={onSaved} />);
  fireEvent.press(screen.getByTestId('advanced-rules-toggle'));
  return { onSaved };
};

const field = (key: string) => screen.getByTestId(`field-rules-${key}`);
const toggle = (key: string) => screen.getByTestId(`rules-${key}-switch`);
const save = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('rules-save'));
  });

beforeEach(() => {
  jest.clearAllMocks();
  request.mockResolvedValue({});
});

describe('VenueRulesSection', () => {
  it('stays collapsed until opened', () => {
    renderWithProviders(<VenueRulesSection venueId="v1" rules={RULES} onSaved={jest.fn()} />);
    expect(screen.getByText('availability.rules.title')).toBeOnTheScreen();
    expect(screen.queryByTestId('rules-save')).toBeNull();
  });

  it('shows the four numbers and four switches as saved', () => {
    mount();
    expect(field('buffer_minutes').props.value).toBe('15');
    expect(field('min_notice_minutes').props.value).toBe('60');
    expect(field('max_advance_days').props.value).toBe('30');
    expect(field('max_bookings_per_slot').props.value).toBe('2');
    expect(toggle('allow_instant_booking').props.value).toBe(true);
    expect(toggle('allow_waitlist').props.value).toBe(false);
    expect(toggle('booking_approval_required').props.value).toBe(false);
    expect(toggle('allow_multiple_bookings').props.value).toBe(true);
  });

  it('saves every rule, with edited numbers and flipped switches, and tells the venue it changed', async () => {
    const { onSaved } = mount();
    fireEvent.changeText(field('buffer_minutes'), '30');
    fireEvent(toggle('allow_waitlist'), 'valueChange', true);
    fireEvent(toggle('allow_instant_booking'), 'valueChange', false);
    await save();
    expect(request).toHaveBeenCalledWith(
      UpdateVenueSettingsDocument,
      {
        venue_doc_id: 'v1',
        input: {
          rules: {
            allow_instant_booking: false,
            allow_waitlist: true,
            booking_approval_required: false,
            allow_multiple_bookings: true,
            buffer_minutes: 30,
            min_notice_minutes: 60,
            max_advance_days: 30,
            max_bookings_per_slot: 2,
          },
        },
      },
      { auth: true },
    );
    expect(await screen.findByTestId('rules-saved')).toBeOnTheScreen();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('flips the other two switches too', async () => {
    mount();
    fireEvent(toggle('booking_approval_required'), 'valueChange', true);
    fireEvent(toggle('allow_multiple_bookings'), 'valueChange', false);
    await save();
    const rules = request.mock.calls[0][1].input.rules;
    expect(rules.booking_approval_required).toBe(true);
    expect(rules.allow_multiple_bookings).toBe(false);
  });

  it.each([
    ['empty', '', 0],
    ['text', 'abc', 0],
    ['negative', '-5', 0],
    ['a fraction', '10.6', 11],
  ])('turns a %s number into a whole number from zero up', async (_label, typed, expected) => {
    mount();
    fireEvent.changeText(field('min_notice_minutes'), typed);
    await save();
    expect(request.mock.calls[0][1].input.rules.min_notice_minutes).toBe(expected);
    expect(field('min_notice_minutes').props.value).toBe(String(expected));
  });

  it('caps advance booking at 60 days but not the other numbers', async () => {
    mount();
    fireEvent.changeText(field('max_advance_days'), '200');
    fireEvent.changeText(field('max_bookings_per_slot'), '200');
    await save();
    const rules = request.mock.calls[0][1].input.rules;
    expect(rules.max_advance_days).toBe(60);
    expect(rules.max_bookings_per_slot).toBe(200);
    expect(field('max_advance_days').props.value).toBe('60');
  });

  it('shows the server message when the save fails', async () => {
    request.mockRejectedValueOnce(new Error('Not allowed'));
    const { onSaved } = mount();
    await save();
    expect(await screen.findByTestId('rules-error')).toHaveTextContent('Not allowed');
    expect(screen.queryByTestId('rules-saved')).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows the generic failure sentence when the failure carries no message', async () => {
    request.mockRejectedValueOnce('nope');
    mount();
    await save();
    expect(await screen.findByTestId('rules-error')).toHaveTextContent('availability.updateFailed');
  });

  it('shows the saving label and blocks a second save while the request runs', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    mount();
    await save();
    expect(screen.getByLabelText('availability.rules.saving')).toBeOnTheScreen();
    expect(screen.getByTestId('rules-save')).toBeDisabled();
    await act(async () => finish({}));
    await waitFor(() => expect(screen.getByLabelText('availability.rules.save')).toBeOnTheScreen());
  });

  it('clears an earlier error when saving again', async () => {
    request.mockRejectedValueOnce(new Error('Not allowed'));
    mount();
    await save();
    await screen.findByTestId('rules-error');
    await save();
    await waitFor(() => expect(screen.queryByTestId('rules-error')).toBeNull());
  });
});
