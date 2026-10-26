import { fireEvent, screen } from '@testing-library/react-native';
import { autoPodHostMeetingReady, type AutoPodHostMeeting } from '@duncit/utils';

import {
  BLANK_HOST_MEETING,
  HostMeetingFields,
  hostMeetingInput,
} from '@/components/auto-pods/HostMeetingFields';
import { HostEarningsFields } from '@/components/auto-pods/HostEarningsFields';
import { HostProjectionLines } from '@/components/auto-pods/HostProjectionLines';
import type { AutoPodHostProjection } from '@/hooks/useAutoPodHostProjection';
import { autoPodTestLabels as labels } from '@/utils/auto-pod-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    dateTimeInputFormat: 'yyyy-MM-dd HH:mm',
    parseDateTime: (text: string) => (text ? new Date(`${text.replace(' ', 'T')}:00Z`) : null),
  }),
}));
jest.mock('@/components/AppSlider', () => ({
  AppSlider: ({
    value,
    min,
    max,
    onValueChange,
  }: {
    value: number[];
    min: number;
    max: number;
    onValueChange: (next: number[]) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID="auto-pod-spots-slider" onPress={() => onValueChange([max])}>
        <Text>{`slider:${value[0]}:${min}-${max}`}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/create-pod/ChipSelectField', () => ({
  ChipSelectField: ({
    options,
    value,
    onChange,
    testID,
  }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (next: string) => void;
    testID: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={testID} onPress={() => onChange(options[options.length - 1]?.value ?? '')}>
        <Text>{`platform:${value}:${options.map((option) => option.label).join(',')}`}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/create-pod/DateTimeField', () => ({
  DateTimeField: ({
    value,
    onChange,
    minDateTime,
    testID,
  }: {
    value: string;
    onChange: (text: string) => void;
    minDateTime: Date;
    testID: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text, TextInput } = require('react-native');
    return (
      <Pressable testID={testID}>
        <Text testID={`${testID}-value`}>{value}</Text>
        <Text testID={`${testID}-min`}>{minDateTime.toISOString()}</Text>
        <TextInput testID={`${testID}-input`} onChangeText={onChange} />
      </Pressable>
    );
  },
}));

const money = (amount: number) => `₹${amount}`;

const projection = (over: Partial<AutoPodHostProjection> = {}): AutoPodHostProjection => ({
  min_spots: 2,
  max_spots: 10,
  pod_amount: 200,
  no_of_spots: 5,
  total_collection: 1000,
  gst_amount: 30,
  platform_fee_amount: 20,
  venue_amount: 400,
  club_admin_amount: 100,
  host_receives: 450,
  viable: true,
  ...over,
});

describe('HostProjectionLines', () => {
  it('draws nothing before the server has priced anything', () => {
    renderWithProviders(
      <HostProjectionLines projection={null} labels={labels} formatMoney={money} />,
    );
    expect(screen.queryByTestId('auto-pod-host-projection')).toBeNull();
    expect(screen.queryByTestId('auto-pod-projection-not-viable')).toBeNull();
  });

  it('says the numbers do not work, and shows no breakdown, when not viable', () => {
    renderWithProviders(
      <HostProjectionLines
        projection={projection({ viable: false })}
        labels={labels}
        formatMoney={money}
      />,
    );
    expect(screen.getByTestId('auto-pod-projection-not-viable')).toHaveTextContent(
      labels.projectionNotViable,
    );
    expect(screen.queryByTestId('auto-pod-host-projection')).toBeNull();
  });

  it('shows what the host keeps and every cut, with GST and platform fee together', () => {
    renderWithProviders(
      <HostProjectionLines projection={projection()} labels={labels} formatMoney={money} />,
    );
    expect(screen.getByText(labels.projectionTitle)).toBeOnTheScreen();
    expect(screen.getByText(labels.projectionHost('₹450'))).toBeOnTheScreen();
    expect(
      screen.getByText(
        `${labels.projectionVenue('₹400')} · ${labels.projectionClub('₹100')} · ${labels.projectionFees('₹50')}`,
      ),
    ).toBeOnTheScreen();
  });
});

describe('HostEarningsFields', () => {
  const mount = (over: Partial<React.ComponentProps<typeof HostEarningsFields>> = {}) => {
    const onPrice = jest.fn();
    const onSpots = jest.fn();
    renderWithProviders(
      <HostEarningsFields
        price=""
        onPrice={onPrice}
        spots={0}
        onSpots={onSpots}
        projection={null}
        loading={false}
        failed={false}
        labels={labels}
        formatMoney={money}
        {...over}
      />,
    );
    return { onPrice, onSpots };
  };

  it('asks for a price first: hint, no total, a plain spots input', () => {
    mount();
    expect(screen.getByTestId('auto-pod-earnings-hint')).toHaveTextContent(
      labels.earningsEnterPrice,
    );
    expect(screen.queryByTestId('auto-pod-total-spots')).toBeNull();
    expect(screen.queryByTestId('auto-pod-spots-slider')).toBeNull();
    expect(screen.getByTestId('auto-pod-earnings-spots').props.value).toBe('');
    expect(screen.queryByTestId('auto-pod-earnings-price-error')).toBeNull();
    expect(screen.queryByTestId('auto-pod-earnings-failed')).toBeNull();
  });

  it('keeps digits only in the price', () => {
    const { onPrice } = mount();
    fireEvent.changeText(screen.getByTestId('auto-pod-earnings-price'), '₹1,2a0.5');
    expect(onPrice).toHaveBeenCalledWith('1205');
  });

  it('keeps digits only in the spots, and reads a blank as zero', () => {
    const { onSpots } = mount({ spots: 4 });
    expect(screen.getByTestId('auto-pod-earnings-spots').props.value).toBe('4');
    fireEvent.changeText(screen.getByTestId('auto-pod-earnings-spots'), '1x2');
    expect(onSpots).toHaveBeenLastCalledWith(12);
    fireEvent.changeText(screen.getByTestId('auto-pod-earnings-spots'), '');
    expect(onSpots).toHaveBeenLastCalledWith(0);
  });

  it('flags a price of zero but not a blank or a positive one', () => {
    mount({ price: '0' });
    expect(screen.getByTestId('auto-pod-earnings-price-error')).toHaveTextContent(
      labels.earningsPricePositive,
    );
  });

  it('does not flag a positive price', () => {
    mount({ price: '150' });
    expect(screen.queryByTestId('auto-pod-earnings-price-error')).toBeNull();
  });

  it('shows the venue ceiling, a slider across the range and the breakdown', () => {
    const { onSpots } = mount({ price: '200', spots: 5, projection: projection() });
    expect(screen.getByTestId('auto-pod-total-spots')).toHaveTextContent(
      labels.earningsTotalSpots(10),
    );
    expect(screen.getByText('slider:5:2-10')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-spots-value')).toHaveTextContent('5');
    expect(screen.getByText(labels.spotsRange(2, 10))).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-host-projection')).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-pod-earnings-hint')).toBeNull();
    fireEvent.press(screen.getByTestId('auto-pod-spots-slider'));
    expect(onSpots).toHaveBeenCalledWith(10);
  });

  it('clamps the spots shown to the venue range', () => {
    mount({ spots: 99, projection: projection() });
    expect(screen.getByTestId('auto-pod-spots-value')).toHaveTextContent('10');
    expect(screen.getByText('slider:10:2-10')).toBeOnTheScreen();
  });

  it('falls back to the plain spots input when the range has no room to drag', () => {
    mount({ spots: 3, projection: projection({ min_spots: 3, max_spots: 3 }) });
    expect(screen.queryByTestId('auto-pod-spots-slider')).toBeNull();
    expect(screen.getByTestId('auto-pod-earnings-spots').props.value).toBe('3');
  });

  it('shows a spinner while pricing and says so when the read failed', () => {
    mount({ loading: true, failed: true });
    expect(screen.getByLabelText(/Loading/)).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-earnings-failed')).toHaveTextContent(labels.loadFailed);
  });
});

describe('HostMeetingFields', () => {
  const now = new Date('2030-01-01T10:00:00.000Z');
  const mount = (value: AutoPodHostMeeting = BLANK_HOST_MEETING) => {
    const onChange = jest.fn();
    renderWithProviders(
      <HostMeetingFields value={value} onChange={onChange} labels={labels} now={now} />,
    );
    return onChange;
  };

  it('starts blank, with both pickers opening after now', () => {
    mount();
    expect(screen.getByText(labels.meetingHint)).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pod-meeting-start-value')).toHaveTextContent('');
    expect(screen.getByTestId('auto-pod-meeting-start-min')).toHaveTextContent(now.toISOString());
    expect(screen.getByTestId('auto-pod-meeting-end-min')).toHaveTextContent(now.toISOString());
    expect(screen.getByTestId('auto-pod-meeting-link').props.value).toBe('');
  });

  it('offers every platform, naming the last one with the Other label', () => {
    mount();
    expect(screen.getByTestId('auto-pod-meeting-platform')).toHaveTextContent(
      new RegExp(`${labels.meetingPlatformOther}$`),
    );
  });

  it('merges each edit into the meeting without losing the other fields', () => {
    const value: AutoPodHostMeeting = {
      meeting_platform: 'ZOOM',
      meeting_url: 'https://zoom.us/j/1',
      pod_date_time: null,
      pod_end_date_time: null,
    };
    const onChange = mount(value);
    fireEvent.changeText(screen.getByTestId('auto-pod-meeting-link'), 'https://meet.x/y');
    expect(onChange).toHaveBeenLastCalledWith({ ...value, meeting_url: 'https://meet.x/y' });
    fireEvent.press(screen.getByTestId('auto-pod-meeting-platform'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ meeting_url: value.meeting_url }),
    );
    expect(onChange.mock.lastCall?.[0].meeting_platform).not.toBe('ZOOM');
  });

  it('parses typed start and end text into dates', () => {
    const onChange = mount();
    fireEvent.changeText(screen.getByTestId('auto-pod-meeting-start-input'), '2030-01-05 09:00');
    expect(onChange).toHaveBeenLastCalledWith({
      ...BLANK_HOST_MEETING,
      pod_date_time: new Date('2030-01-05T09:00:00Z'),
    });
    fireEvent.changeText(screen.getByTestId('auto-pod-meeting-end-input'), '');
    expect(onChange).toHaveBeenLastCalledWith({ ...BLANK_HOST_MEETING, pod_end_date_time: null });
  });

  it('shows chosen times in the configured pattern and opens the end picker after the start', () => {
    const start = new Date(2030, 0, 5, 9, 0);
    mount({ ...BLANK_HOST_MEETING, pod_date_time: start, pod_end_date_time: start });
    expect(screen.getByTestId('auto-pod-meeting-start-value')).toHaveTextContent(
      '2030-01-05 09:00',
    );
    expect(screen.getByTestId('auto-pod-meeting-end-min')).toHaveTextContent(start.toISOString());
  });

  it('keeps the end picker after now when the start is already in the past', () => {
    mount({ ...BLANK_HOST_MEETING, pod_date_time: new Date('2029-12-31T10:00:00.000Z') });
    expect(screen.getByTestId('auto-pod-meeting-end-min')).toHaveTextContent(now.toISOString());
  });
});

describe('hostMeetingInput', () => {
  it('sends a blank meeting as nulls and empty strings', () => {
    expect(hostMeetingInput(BLANK_HOST_MEETING)).toEqual({
      meeting_platform: null,
      meeting_url: '',
      pod_date_time: '',
      pod_end_date_time: '',
    });
    expect(autoPodHostMeetingReady(BLANK_HOST_MEETING, now0())).toBe(false);
  });

  it('trims the link and sends the window as ISO strings', () => {
    const meeting: AutoPodHostMeeting = {
      meeting_platform: 'ZOOM',
      meeting_url: '  https://zoom.us/j/1  ',
      pod_date_time: new Date('2030-01-05T09:00:00.000Z'),
      pod_end_date_time: new Date('2030-01-05T10:00:00.000Z'),
    };
    expect(hostMeetingInput(meeting)).toEqual({
      meeting_platform: 'ZOOM',
      meeting_url: 'https://zoom.us/j/1',
      pod_date_time: '2030-01-05T09:00:00.000Z',
      pod_end_date_time: '2030-01-05T10:00:00.000Z',
    });
    expect(autoPodHostMeetingReady(meeting, now0())).toBe(true);
  });
});

function now0() {
  return new Date('2030-01-01T10:00:00.000Z').getTime();
}
