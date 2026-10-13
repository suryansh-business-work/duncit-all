import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BulkActionsSection } from '@/components/venue-availability/advanced/BulkActionsSection';
import {
  BulkDeleteVenueSlotsDocument,
  BulkUpdateVenueSlotsDocument,
} from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// The native date picker cannot run here; the stub just reports a chosen date.
jest.mock('@/components/venue-availability/DateTimePickerField', () => {
  const { Pressable: P, Text: T } = jest.requireActual('react-native');
  return {
    DateTimePickerField: ({
      testID,
      onChange,
    }: {
      testID: string;
      onChange: (d: Date) => void;
    }) => (
      <P
        testID={testID}
        onPress={() =>
          onChange(
            new Date(
              testID === 'bulk-from' ? '2031-02-01T00:00:00.000Z' : '2031-02-28T00:00:00.000Z',
            ),
          )
        }
      >
        <T>{testID}</T>
      </P>
    ),
  };
});

const mockRequest = graphqlRequest as jest.Mock;

function mount() {
  const onDone = jest.fn();
  renderWithProviders(<BulkActionsSection venueId="venue-1" onDone={onDone} />);
  fireEvent.press(screen.getByTestId('advanced-bulk-toggle'));
  return { onDone };
}

const confirm = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('bulk-action-confirm-btn'));
  });

beforeEach(() => mockRequest.mockReset());

describe('BulkActionsSection', () => {
  it('stays collapsed until opened', () => {
    renderWithProviders(<BulkActionsSection venueId="venue-1" onDone={jest.fn()} />);
    expect(screen.queryByTestId('bulk-delete')).toBeNull();
    fireEvent.press(screen.getByTestId('advanced-bulk-toggle'));
    expect(screen.getByTestId('bulk-delete')).toBeOnTheScreen();
  });

  it('deletes nothing until the confirmation is accepted, and cancelling aborts', async () => {
    mount();
    fireEvent.press(screen.getByTestId('bulk-delete'));
    expect(mockRequest).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('bulk-action-cancel'));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('deletes with the whole-venue filter, reports the count and tells the parent', async () => {
    mockRequest.mockResolvedValue({ bulkDeleteVenueSlots: { affected: 7 } });
    const { onDone } = mount();
    fireEvent.press(screen.getByTestId('bulk-delete'));
    await confirm();
    expect(mockRequest.mock.calls[0][0]).toBe(BulkDeleteVenueSlotsDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({
      input: { venue_id: 'venue-1', from: null, to: null, weekdays: null },
    });
    expect(mockRequest.mock.calls[0][2]).toEqual({ auth: true });
    await waitFor(() => expect(screen.getByTestId('bulk-result')).toHaveTextContent(/7/));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('sends the chosen date range and weekdays with the action', async () => {
    mockRequest.mockResolvedValue({ bulkUpdateVenueSlots: { affected: 3, skipped: 0 } });
    mount();
    fireEvent.press(screen.getByTestId('bulk-from'));
    fireEvent.press(screen.getByTestId('bulk-to'));
    fireEvent.press(screen.getByTestId('bulk-weekdays-day-1'));
    fireEvent.press(screen.getByTestId('bulk-disable'));
    await confirm();
    expect(mockRequest.mock.calls[0][0]).toBe(BulkUpdateVenueSlotsDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({
      input: {
        venue_id: 'venue-1',
        from: '2031-02-01T00:00:00.000Z',
        to: '2031-02-28T00:00:00.000Z',
        weekdays: [1],
        block: true,
      },
    });
  });

  it('enables slots with block false', async () => {
    mockRequest.mockResolvedValue({ bulkUpdateVenueSlots: { affected: 2, skipped: 0 } });
    mount();
    fireEvent.press(screen.getByTestId('bulk-enable'));
    await confirm();
    expect(mockRequest.mock.calls[0][1].input).toMatchObject({ block: false });
  });

  it('says how many booked slots were skipped', async () => {
    mockRequest.mockResolvedValue({ bulkUpdateVenueSlots: { affected: 2, skipped: 5 } });
    mount();
    fireEvent.press(screen.getByTestId('bulk-disable'));
    await confirm();
    await waitFor(() => expect(screen.getByTestId('bulk-result')).toHaveTextContent(/5/));
  });

  it('keeps Set price disabled until a price is typed, then re-prices as a whole number', async () => {
    mockRequest.mockResolvedValue({ bulkUpdateVenueSlots: { affected: 4, skipped: 0 } });
    mount();
    const button = screen.getByTestId('bulk-set-price');
    expect(button.props['aria-disabled'] ?? button.props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('field-bulk-price'), '449.6');
    fireEvent.press(screen.getByTestId('bulk-set-price'));
    await confirm();
    expect(mockRequest.mock.calls[0][1].input).toMatchObject({ set_price: 450 });
  });

  it('shows the server reason when the action fails and does not call onDone', async () => {
    mockRequest.mockRejectedValue(new Error('Venue is locked'));
    const { onDone } = mount();
    fireEvent.press(screen.getByTestId('bulk-delete'));
    await confirm();
    await waitFor(() =>
      expect(screen.getByTestId('bulk-error')).toHaveTextContent('Venue is locked'),
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.queryByTestId('bulk-result')).toBeNull();
  });

  it('falls back to the localised message for a non-Error failure', async () => {
    mockRequest.mockRejectedValue('nope');
    mount();
    fireEvent.press(screen.getByTestId('bulk-delete'));
    await confirm();
    await waitFor(() => expect(screen.getByTestId('bulk-error')).toBeOnTheScreen());
    expect(screen.getByTestId('bulk-error')).not.toHaveTextContent('nope');
  });
});
