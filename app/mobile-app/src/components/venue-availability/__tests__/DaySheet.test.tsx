import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { VenueSlot } from '@/hooks/useOwnerVenueSlots';
import { renderWithProviders } from '@/utils/test-utils';
import { DaySheet } from '../DaySheet';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/utils/date-format', () => ({ formatDay: (key: string) => `day:${key}` }));

const mockForm = jest.fn();
jest.mock('@/components/venue-availability/AddSlotForm', () => ({
  AddSlotForm: (props: { date: Date; spaces: unknown[]; onCreate: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    mockForm(props);
    return <Text testID="add-form">add-form</Text>;
  },
}));
const mockRows = jest.fn();
jest.mock('@/components/venue-availability/DaySlotRow', () => ({
  DaySlotRow: (props: {
    slot: { id: string };
    busy: boolean;
    onToggleBlock: (slot: unknown) => void;
    onDelete: (slot: unknown) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text, View } = require('react-native');
    mockRows(props);
    return (
      <View>
        <Text>{`row:${props.slot.id}:${props.busy ? 'busy' : 'idle'}`}</Text>
        <Pressable
          testID={`block-${props.slot.id}`}
          onPress={() => props.onToggleBlock(props.slot)}
        />
        <Pressable testID={`delete-${props.slot.id}`} onPress={() => props.onDelete(props.slot)} />
      </View>
    );
  },
}));

const slot = (id: string) => ({ id, status: 'AVAILABLE' }) as unknown as VenueSlot;

const mount = ({
  dayKey = '2030-01-09' as string | null,
  slots = [slot('s1'), slot('s2')],
  isHoliday = false,
  onToggleBlock = jest.fn().mockResolvedValue(undefined),
  onDelete = jest.fn().mockResolvedValue(undefined),
} = {}) => {
  const onClose = jest.fn();
  const onCreate = jest.fn();
  renderWithProviders(
    <DaySheet
      dayKey={dayKey}
      slots={slots}
      isHoliday={isHoliday}
      spaces={[{ label: 'Court 1', capacity: 4 }]}
      onClose={onClose}
      onCreate={onCreate}
      onToggleBlock={onToggleBlock}
      onDelete={onDelete}
    />,
  );
  return { onClose, onCreate, onToggleBlock, onDelete };
};

beforeEach(() => jest.clearAllMocks());

describe('DaySheet — what shows', () => {
  it('stays closed without a day', () => {
    mount({ dayKey: null });
    expect(screen.queryByText('availability.drawerTitle')).toBeNull();
    expect(screen.queryByTestId('add-form')).toBeNull();
  });

  it('shows the day, its slots and the add form for an ordinary day', () => {
    const { onCreate } = mount();
    expect(screen.getByText('availability.drawerTitle')).toBeOnTheScreen();
    expect(screen.getByText('day:2030-01-09')).toBeOnTheScreen();
    expect(screen.getByText('row:s1:idle')).toBeOnTheScreen();
    expect(screen.getByText('row:s2:idle')).toBeOnTheScreen();
    expect(screen.queryByTestId('availability-day-empty')).toBeNull();
    expect(screen.queryByTestId('availability-holiday-alert')).toBeNull();
    expect(mockForm.mock.calls[0][0]).toMatchObject({
      date: new Date('2030-01-09T00:00:00'),
      spaces: [{ label: 'Court 1', capacity: 4 }],
      onCreate,
    });
  });

  it('says the day has no slots yet', () => {
    mount({ slots: [] });
    expect(screen.getByTestId('availability-day-empty')).toHaveTextContent(
      'availability.noSlotsForDate',
    );
  });

  it('warns on a leave day and offers no way to add a slot', () => {
    mount({ isHoliday: true });
    expect(screen.getByTestId('availability-holiday-alert')).toHaveTextContent(
      'availability.holidayAlert',
    );
    expect(screen.queryByTestId('add-form')).toBeNull();
    expect(screen.getByText('row:s1:idle')).toBeOnTheScreen();
  });
});

describe('DaySheet — blocking', () => {
  it('blocks the chosen slot, with the rows busy meanwhile, then frees them', async () => {
    let finish: () => void = () => undefined;
    const onToggleBlock = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    mount({ onToggleBlock });
    await act(async () => {
      fireEvent.press(screen.getByTestId('block-s2'));
    });
    expect(onToggleBlock).toHaveBeenCalledWith(expect.objectContaining({ id: 's2' }));
    expect(screen.getByText('row:s1:busy')).toBeOnTheScreen();
    await act(async () => finish());
    await waitFor(() => expect(screen.getByText('row:s1:idle')).toBeOnTheScreen());
  });

  it('shows the message of a failed block', async () => {
    mount({ onToggleBlock: jest.fn().mockRejectedValue(new Error('Slot is booked')) });
    await act(async () => {
      fireEvent.press(screen.getByTestId('block-s1'));
    });
    expect(await screen.findByTestId('availability-day-error')).toHaveTextContent('Slot is booked');
    expect(screen.getByText('row:s1:idle')).toBeOnTheScreen();
  });

  it('shows the generic sentence when the failure has no message', async () => {
    mount({ onToggleBlock: jest.fn().mockRejectedValue('nope') });
    await act(async () => {
      fireEvent.press(screen.getByTestId('block-s1'));
    });
    expect(await screen.findByTestId('availability-day-error')).toHaveTextContent(
      'availability.updateFailed',
    );
  });

  it('clears an earlier error when the next action starts', async () => {
    const onToggleBlock = jest
      .fn()
      .mockRejectedValueOnce(new Error('Slot is booked'))
      .mockResolvedValueOnce(undefined);
    mount({ onToggleBlock });
    await act(async () => {
      fireEvent.press(screen.getByTestId('block-s1'));
    });
    await screen.findByTestId('availability-day-error');
    await act(async () => {
      fireEvent.press(screen.getByTestId('block-s1'));
    });
    await waitFor(() => expect(screen.queryByTestId('availability-day-error')).toBeNull());
  });
});

describe('DaySheet — deleting', () => {
  const askToDelete = async (id: string) => {
    fireEvent.press(screen.getByTestId(`delete-${id}`));
    await screen.findByText('availability.deleteTitle');
  };

  it('asks before deleting and deletes nothing yet', async () => {
    const { onDelete } = mount();
    expect(screen.queryByText('availability.deleteTitle')).toBeNull();
    await askToDelete('s1');
    expect(screen.getByText('availability.deleteBody')).toBeOnTheScreen();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes the confirmed slot and closes the question', async () => {
    const { onDelete } = mount();
    await askToDelete('s2');
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-slot-delete-confirm-btn'));
    });
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('s2'));
    await waitFor(() => expect(screen.queryByText('availability.deleteTitle')).toBeNull());
  });

  it('keeps the slot when the owner cancels', async () => {
    const { onDelete } = mount();
    await askToDelete('s1');
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-slot-delete-cancel'));
    });
    expect(onDelete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('availability.deleteTitle')).toBeNull());
  });

  it('shows the message of a failed delete and closes the question', async () => {
    mount({ onDelete: jest.fn().mockRejectedValue(new Error('Slot is booked')) });
    await askToDelete('s1');
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-slot-delete-confirm-btn'));
    });
    expect(await screen.findByTestId('availability-day-error')).toHaveTextContent('Slot is booked');
    await waitFor(() => expect(screen.queryByText('availability.deleteTitle')).toBeNull());
  });

  it('shows the generic sentence when a delete failure has no message', async () => {
    mount({ onDelete: jest.fn().mockRejectedValue(undefined) });
    await askToDelete('s1');
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-slot-delete-confirm-btn'));
    });
    expect(await screen.findByTestId('availability-day-error')).toHaveTextContent(
      'availability.deleteFailed',
    );
  });
});

describe('DaySheet — closing', () => {
  it('closes from the dialog close button', () => {
    const { onClose } = mount();
    fireEvent.press(screen.getAllByLabelText('availability.close')[0] as never);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
