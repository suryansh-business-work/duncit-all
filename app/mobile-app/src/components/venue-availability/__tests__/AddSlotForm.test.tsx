import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { SlotDraft } from '@duncit/slots';

import { fallbackT } from '@/i18n/fallback';
import { ApiError } from '@/utils/errors';
import { renderWithProviders } from '@/utils/test-utils';
import { AddSlotForm } from '../AddSlotForm';
import type { VenueSpace } from '../AddSlotFields';

// The clock the form reads, held here so a spec can move it.
let mockNow = new Date(2030, 0, 9, 9, 0);
jest.mock('@/utils/app-formatter', () => ({
  ...jest.requireActual('@/utils/app-formatter'),
  appNow: () => mockNow,
}));

// The fields are native date/time pickers with no state of their own; the form
// owns the draft. Stand them in with a probe that shows what the form passes
// down and applies whatever patch the spec queues.
let mockPatch: Partial<SlotDraft> = {};
jest.mock('../AddSlotFields', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    AddSlotFields: ({
      draft,
      patch,
      activeSpace,
    }: {
      draft: SlotDraft;
      patch: (p: Partial<SlotDraft>) => void;
      activeSpace?: { label: string };
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, { testID: 'probe-price' }, `price:${draft.price}`),
        React.createElement(Text, { testID: 'probe-space' }, `space:${activeSpace?.label ?? '-'}`),
        React.createElement(Pressable, { testID: 'probe-patch', onPress: () => patch(mockPatch) }),
      ),
  };
});

const day = new Date(2030, 0, 9);
const at = (h: number, m = 0) => new Date(2030, 0, 9, h, m);
const spaces: VenueSpace[] = [
  { label: 'Court 1', capacity: 4 },
  { label: 'Court 2', capacity: 8 },
];

function applyPatch(p: Partial<SlotDraft>) {
  mockPatch = p;
  fireEvent.press(screen.getByTestId('probe-patch'));
}

function mount(onCreate = jest.fn().mockResolvedValue(undefined), withSpaces = spaces) {
  renderWithProviders(<AddSlotForm date={day} spaces={withSpaces} onCreate={onCreate} />);
  return onCreate;
}

const issue = () => screen.queryByTestId('add-slot-issue');

/** DuncitButton reports its state as `aria-disabled` (the repo idiom). */
type Host = ReturnType<typeof screen.getByTestId>;
const isDisabled = (node: Host) =>
  node.props.accessibilityState?.disabled === true || node.props['aria-disabled'] === true;

beforeEach(() => {
  mockNow = new Date(2030, 0, 9, 9, 0);
  mockPatch = {};
});

describe('AddSlotForm — validation', () => {
  it('stays quiet while unfinished, and says what is missing on Add', () => {
    const onCreate = mount();
    expect(issue()).toBeNull();
    expect(screen.getByTestId('add-slot-submit')).toHaveTextContent(
      fallbackT('availability.addSlot'),
    );
    expect(screen.getByTestId('probe-space')).toHaveTextContent('space:Court 1');

    fireEvent.press(screen.getByTestId('add-slot-submit'));
    expect(issue()).toHaveTextContent(fallbackT('availability.pickSlotTimes'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows a real rejection live and disables Add', () => {
    mount();
    applyPatch({ startTime: at(11), endTime: at(10) });
    expect(issue()).toHaveTextContent(fallbackT('availability.endAfterStart'));
    expect(isDisabled(screen.getByTestId('add-slot-submit'))).toBe(true);
  });

  it('re-checks the clock at the moment Add is pressed', () => {
    const onCreate = mount();
    applyPatch({ startTime: at(10), endTime: at(11) });
    expect(issue()).toBeNull();

    mockNow = at(10, 30);
    fireEvent.press(screen.getByTestId('add-slot-submit'));
    expect(issue()).toHaveTextContent(fallbackT('availability.startInFuture'));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('a window that passes while the sheet is open stops being addable on the next tick', () => {
    jest.useFakeTimers();
    try {
      mount();
      applyPatch({ startTime: at(10), endTime: at(11) });
      expect(issue()).toBeNull();
      mockNow = at(10, 1);
      act(() => {
        jest.advanceTimersByTime(30_000);
      });
      expect(issue()).toHaveTextContent(fallbackT('availability.startInFuture'));
      expect(isDisabled(screen.getByTestId('add-slot-submit'))).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('AddSlotForm — creating', () => {
  it('sends the slot in the first space, rounding the price, then resets', async () => {
    const onCreate = mount();
    applyPatch({ startTime: at(10), endTime: at(11), price: '99.6', notes: 'Bring shoes' });
    expect(screen.getByTestId('probe-price')).toHaveTextContent('price:99.6');

    fireEvent.press(screen.getByTestId('add-slot-submit'));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith(
      {
        start_at: at(10).toISOString(),
        end_at: at(11).toISOString(),
        whole_day: false,
        price: 100,
        notes: 'Bring shoes',
        space_label: 'Court 1',
        capacity: 4,
      },
      false,
    );
    // Exact match: the draft is back to an empty price.
    await waitFor(() => expect(screen.getByTestId('probe-price')).toHaveTextContent('price:'));
    expect(issue()).toBeNull();
  });

  it('uses the picked space', async () => {
    const onCreate = mount();
    applyPatch({ startTime: at(10), endTime: at(11), spaceLabel: 'Court 2' });
    expect(screen.getByTestId('probe-space')).toHaveTextContent('space:Court 2');
    fireEvent.press(screen.getByTestId('add-slot-submit'));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({ space_label: 'Court 2', capacity: 8 });
  });

  it('sells the whole venue when there are no spaces, and a bad price is free', async () => {
    const onCreate = mount(undefined, []);
    expect(screen.getByTestId('probe-space')).toHaveTextContent('space:-');
    applyPatch({ startTime: at(10), endTime: at(11), price: 'abc' });
    fireEvent.press(screen.getByTestId('add-slot-submit'));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({ space_label: '', capacity: 0, price: 0 });
  });

  it('never sends a negative price', async () => {
    const onCreate = mount();
    applyPatch({ startTime: at(10), endTime: at(11), price: '-50' });
    fireEvent.press(screen.getByTestId('add-slot-submit'));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0].price).toBe(0);
  });

  it('shows a generic failure for a rejection that is not an Error', async () => {
    const onCreate = mount(jest.fn().mockRejectedValue('nope'));
    applyPatch({ startTime: at(10), endTime: at(11) });
    fireEvent.press(screen.getByTestId('add-slot-submit'));
    await waitFor(() =>
      expect(issue()).toHaveTextContent(fallbackT('availability.createFailed')),
    );
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('add-slot-overwrite')).toBeNull();
    expect(isDisabled(screen.getByTestId('add-slot-submit'))).toBe(false);
  });
});

describe('AddSlotForm — overwrite after a clash', () => {
  const conflict = () => new ApiError('Slot overlaps', 409, { code: 'CONFLICT' });

  async function clashed(onCreate: jest.Mock) {
    mount(onCreate);
    applyPatch({ startTime: at(10), endTime: at(11) });
    fireEvent.press(screen.getByTestId('add-slot-submit'));
    await waitFor(() => expect(screen.getByTestId('add-slot-overwrite')).toBeOnTheScreen());
    expect(issue()).toHaveTextContent('Slot overlaps');
  }

  it('offers the overwrite and re-sends the same payload once confirmed', async () => {
    const onCreate = jest.fn().mockRejectedValueOnce(conflict()).mockResolvedValueOnce(undefined);
    await clashed(onCreate);

    fireEvent.press(screen.getByTestId('add-slot-overwrite'));
    fireEvent.press(await screen.findByTestId('add-slot-overwrite-confirm-btn'));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    expect(onCreate.mock.calls[1]).toEqual([onCreate.mock.calls[0][0], true]);
    await waitFor(() => expect(screen.queryByTestId('add-slot-overwrite')).toBeNull());
    expect(issue()).toBeNull();
  });

  it('backs out of the overwrite without sending', async () => {
    const onCreate = jest.fn().mockRejectedValueOnce(conflict());
    await clashed(onCreate);

    fireEvent.press(screen.getByTestId('add-slot-overwrite'));
    fireEvent.press(await screen.findByTestId('add-slot-overwrite-cancel'));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('add-slot-overwrite')).toBeOnTheScreen();
  });

  it('does not offer a second overwrite when the overwrite itself clashes', async () => {
    const onCreate = jest.fn().mockRejectedValueOnce(conflict()).mockRejectedValueOnce(conflict());
    await clashed(onCreate);

    fireEvent.press(screen.getByTestId('add-slot-overwrite'));
    fireEvent.press(await screen.findByTestId('add-slot-overwrite-confirm-btn'));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('add-slot-overwrite')).toBeNull());
    expect(issue()).toHaveTextContent('Slot overlaps');
  });

  it('does not offer an overwrite for any other server error', async () => {
    const onCreate = mount(jest.fn().mockRejectedValue(new ApiError('Nope', 400, { code: 'BAD' })));
    applyPatch({ startTime: at(10), endTime: at(11) });
    fireEvent.press(screen.getByTestId('add-slot-submit'));
    await waitFor(() => expect(issue()).toHaveTextContent('Nope'));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('add-slot-overwrite')).toBeNull();
  });
});
