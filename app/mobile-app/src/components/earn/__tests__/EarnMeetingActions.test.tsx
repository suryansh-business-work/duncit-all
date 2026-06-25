import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { EarnMeetingActions } from '@/components/earn/EarnMeetingActions';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const opName = (doc: { definitions?: { name?: { value?: string } }[] }) =>
  doc?.definitions?.[0]?.name?.value;

const SLOTS = [
  { start_at: '2027-01-04T04:30:00.000Z', end_at: '2027-01-04T05:00:00.000Z', available: true },
  { start_at: '2027-01-04T05:00:00.000Z', end_at: '2027-01-04T05:30:00.000Z', available: false },
];

function route({ slots = SLOTS, failReschedule = false, failCancel = false } = {}) {
  mockRequest.mockImplementation((doc: never) => {
    switch (opName(doc)) {
      case 'MeetingSlots':
        return Promise.resolve({ meetingSlots: slots });
      case 'RescheduleMyMeeting':
        return failReschedule
          ? Promise.reject(new Error('That slot was just booked'))
          : Promise.resolve({ rescheduleMyMeeting: { id: 'm1' } });
      case 'CancelMyMeeting':
        return failCancel
          ? Promise.reject(new Error('x'))
          : Promise.resolve({ cancelMyMeeting: { id: 'm1', status: 'CANCELLED' } });
      default:
        return Promise.resolve({});
    }
  });
}

beforeEach(() => mockRequest.mockReset());

describe('EarnMeetingActions', () => {
  it('reschedules to a picked slot with a reason and notifies the parent', async () => {
    route();
    const onChanged = jest.fn();
    renderWithProviders(<EarnMeetingActions kind="VENUE" onChanged={onChanged} />);
    fireEvent.press(screen.getByTestId('reschedule-VENUE'));
    await screen.findByTestId('slot-2027-01-04T04:30:00.000Z');

    // No slot picked yet → inline error.
    fireEvent.press(screen.getByTestId('reschedule-confirm'));
    expect(await screen.findByTestId('reschedule-error')).toHaveTextContent(/available slot/);

    // Slot picked but no reason → reason error.
    fireEvent.press(screen.getByTestId('slot-2027-01-04T04:30:00.000Z'));
    fireEvent.press(screen.getByTestId('reschedule-confirm'));
    expect(await screen.findByTestId('reschedule-error')).toHaveTextContent(/why you are/);

    fireEvent.changeText(screen.getByTestId('reschedule-reason'), 'Clashing with work');
    fireEvent.press(screen.getByTestId('reschedule-confirm'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(screen.queryByTestId('reschedule-dialog')).toBeNull(), {
      timeout: 5000,
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        kind: 'VENUE',
        requested_at: '2027-01-04T04:30:00.000Z',
        reason: 'Clashing with work',
      }),
      { auth: true },
    );
  }, 15000);

  it('hides the reschedule action once the one-time option is used', () => {
    route();
    renderWithProviders(
      <EarnMeetingActions kind="HOST" rescheduleCount={1} onChanged={jest.fn()} />,
    );
    expect(screen.queryByTestId('reschedule-HOST')).toBeNull();
    expect(screen.getByTestId('reschedule-used-HOST')).toHaveTextContent(
      /one-time reschedule option/,
    );
    // Cancel is still offered.
    expect(screen.getByTestId('cancel-HOST')).toBeOnTheScreen();
  });

  it('shows a reschedule failure and keeps the dialog open', async () => {
    route({ failReschedule: true });
    renderWithProviders(<EarnMeetingActions kind="HOST" onChanged={jest.fn()} />);
    fireEvent.press(screen.getByTestId('reschedule-HOST'));
    fireEvent.press(await screen.findByTestId('slot-2027-01-04T04:30:00.000Z'));
    fireEvent.changeText(screen.getByTestId('reschedule-reason'), 'Need a later time');
    fireEvent.press(screen.getByTestId('reschedule-confirm'));
    expect(await screen.findByTestId('reschedule-error')).toHaveTextContent(/just booked/);
    fireEvent.press(screen.getByTestId('reschedule-close'));
    expect(screen.queryByTestId('reschedule-dialog')).toBeNull();
  });

  it('shows the empty state and a slots load failure', async () => {
    route({ slots: [] });
    renderWithProviders(<EarnMeetingActions kind="ECOMM" onChanged={jest.fn()} />);
    fireEvent.press(screen.getByTestId('reschedule-ECOMM'));
    expect(await screen.findByTestId('reschedule-empty')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('reschedule-close'));

    mockRequest.mockImplementation((doc: never) =>
      opName(doc) === 'MeetingSlots' ? Promise.reject(new Error('down')) : Promise.resolve({}),
    );
    fireEvent.press(screen.getByTestId('reschedule-ECOMM'));
    expect(await screen.findByTestId('reschedule-error')).toBeOnTheScreen();
  });

  it('closes both dialogs from their backdrops', async () => {
    route();
    renderWithProviders(<EarnMeetingActions kind="VENUE" onChanged={jest.fn()} />);
    fireEvent.press(screen.getByTestId('reschedule-VENUE'));
    await screen.findByTestId('reschedule-dialog');
    fireEvent.press(screen.getByTestId('reschedule-backdrop'));
    expect(screen.queryByTestId('reschedule-dialog')).toBeNull();
    fireEvent.press(screen.getByTestId('cancel-VENUE'));
    fireEvent.press(screen.getByTestId('cancel-backdrop'));
    expect(screen.queryByTestId('cancel-dialog')).toBeNull();
  });

  it('cancels the meeting after a reason and confirmation', async () => {
    route();
    const onChanged = jest.fn();
    renderWithProviders(<EarnMeetingActions kind="VENUE" onChanged={onChanged} />);
    fireEvent.press(screen.getByTestId('cancel-VENUE'));
    expect(screen.getByTestId('cancel-dialog')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('cancel-keep'));
    expect(screen.queryByTestId('cancel-dialog')).toBeNull();

    fireEvent.press(screen.getByTestId('cancel-VENUE'));
    // Confirm without a reason → inline error, no request sent.
    fireEvent.press(screen.getByTestId('cancel-confirm'));
    expect(await screen.findByTestId('cancel-error')).toHaveTextContent(/why you are/);
    expect(onChanged).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('cancel-reason'), 'No longer interested');
    fireEvent.press(screen.getByTestId('cancel-confirm'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled(), { timeout: 5000 });
    await waitFor(() => expect(screen.queryByTestId('cancel-dialog')).toBeNull(), {
      timeout: 5000,
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'VENUE', reason: 'No longer interested' }),
      { auth: true },
    );
  }, 15000);

  it('keeps the cancel dialog open and surfaces an error when the cancel call fails', async () => {
    route({ failCancel: true });
    const onChanged = jest.fn();
    renderWithProviders(<EarnMeetingActions kind="VENUE" onChanged={onChanged} />);
    fireEvent.press(screen.getByTestId('cancel-VENUE'));
    fireEvent.changeText(screen.getByTestId('cancel-reason'), 'Busy');
    fireEvent.press(screen.getByTestId('cancel-confirm'));
    expect(await screen.findByTestId('cancel-error')).toBeOnTheScreen();
    expect(screen.getByTestId('cancel-dialog')).toBeOnTheScreen();
    expect(onChanged).not.toHaveBeenCalled();
  }, 15000);
});
