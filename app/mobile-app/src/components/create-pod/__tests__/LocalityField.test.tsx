import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { LocalityField } from '@/components/create-pod/steps/LocalityField';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodLocation,
} from '@/components/create-pod/create-pod.types';
import { detectDeviceLocation } from '@/utils/device-location';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/utils/device-location', () => ({ detectDeviceLocation: jest.fn() }));

// The picker has its own spec (drilldown, GPS, map). Stub it to a button that
// applies a configurable (location, zone) pick and closes, like the real one.
let mockPick: [{ id: string }, string] = [{ id: 'loc-pune' }, 'Baner'];
jest.mock('@/components/LocationDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    LocationDialog: ({
      open,
      onApply,
      onClose,
      initialLocationId,
    }: {
      open: boolean;
      onApply: (loc: { id: string }, zone: string) => void;
      onClose: () => void;
      initialLocationId: string;
    }) =>
      open ? (
        <Pressable
          testID="mock-location-apply"
          onPress={() => {
            onApply(mockPick[0], mockPick[1]);
            onClose();
          }}
        >
          <Text testID="mock-location-initial">{initialLocationId}</Text>
        </Pressable>
      ) : null,
  };
});

const detect = detectDeviceLocation as jest.Mock;

const lucknow: CreatePodLocation = {
  id: 'loc-lucknow',
  location_name: 'Lucknow',
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  location_zones: [
    { zone_name: 'Gomti Nagar', pincode: '226010' },
    { zone_name: 'Hazratganj', pincode: '226001' },
  ],
};
const pune: CreatePodLocation = {
  id: 'loc-pune',
  location_name: 'Pune',
  city: 'Pune',
  state: 'Maharashtra',
  location_zones: [{ zone_name: 'Baner' }],
};
const LOCATIONS = [lucknow, pune];
const foundLucknow = { status: 'FOUND', city: 'Lucknow', location: lucknow, zone: 'Gomti Nagar' };

let formRef: ReturnType<typeof useForm<CreatePodFormValues, any, CreatePodFormValues>> | null =
  null;

function Harness({
  initial = {},
  locations = LOCATIONS,
}: Readonly<{ initial?: Partial<CreatePodFormValues>; locations?: CreatePodLocation[] }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  formRef = form;
  return <LocalityField form={form} locations={locations} />;
}

const selected = () => screen.getByTestId('create-pod-locality-selected');
/** The chip also holds its icon, so read the text node inside it. */
const expectChip = (text: string) => expect(within(selected()).getByText(text)).toBeOnTheScreen();

/** A lookup the test settles itself, to see the field while it is still out. */
function pendingLookup() {
  let settle: (value: unknown) => void = () => undefined;
  detect.mockReturnValue(
    new Promise((done) => {
      settle = done;
    }),
  );
  return (value: unknown) => settle(value);
}

beforeEach(() => {
  jest.clearAllMocks();
  formRef = null;
  mockPick = [{ id: 'loc-pune' }, 'Baner'];
});

describe('LocalityField', () => {
  it('opens on the area the device is in, finding it first', async () => {
    const settle = pendingLookup();
    renderWithProviders(<Harness />);

    // FieldLabel suffixes the id it is given with "-label".
    expect(screen.getByTestId('create-pod-locality-label-label')).toHaveTextContent('Locality');
    expectChip('Finding your locality…');

    await act(async () => settle(foundLucknow));

    expectChip('Gomti Nagar, Lucknow');
    expect(formRef?.getValues()).toMatchObject({
      location_id: 'loc-lucknow',
      locality: 'Gomti Nagar',
    });
    expect(screen.queryByTestId('create-pod-locality-detect-failed')).toBeNull();
  });

  it('keeps a resumed draft on its own area without asking the device', () => {
    renderWithProviders(
      <Harness initial={{ location_id: 'loc-lucknow', locality: 'Hazratganj' }} />,
    );

    expect(detect).not.toHaveBeenCalled();
    expectChip('Hazratganj, Lucknow');
  });

  it('says no location is chosen while there are no cities to match', () => {
    renderWithProviders(<Harness locations={[]} />);

    expect(detect).not.toHaveBeenCalled();
    expectChip('No location selected');
  });

  it('asks the host to pick when the device cannot be placed', async () => {
    detect.mockResolvedValue({ status: 'DENIED' });
    renderWithProviders(<Harness />);

    expect(await screen.findByTestId('create-pod-locality-detect-failed')).toHaveTextContent(
      "We couldn't find your locality from this device. Use Edit location to choose it.",
    );
    expectChip('No location selected');
  });

  it('applies a pick from Edit location and closes the picker', async () => {
    detect.mockResolvedValue(foundLucknow);
    renderWithProviders(<Harness />);
    await waitFor(() => expectChip('Gomti Nagar, Lucknow'));

    const edit = screen.getByTestId('create-pod-edit-location');
    expect(edit).toHaveProp('aria-label', 'Edit location');
    fireEvent.press(edit);
    expect(screen.getByTestId('mock-location-initial')).toHaveTextContent('loc-lucknow');
    fireEvent.press(screen.getByTestId('mock-location-apply'));

    expect(screen.queryByTestId('mock-location-apply')).toBeNull();
    expectChip('Baner, Pune');
    expect(formRef?.getValues('location_id')).toBe('loc-pune');
  });

  it('lets a pick made during the lookup win over its late answer', async () => {
    const settle = pendingLookup();
    renderWithProviders(<Harness />);

    fireEvent.press(screen.getByTestId('create-pod-edit-location'));
    fireEvent.press(screen.getByTestId('mock-location-apply'));
    await act(async () => settle(foundLucknow));

    expectChip('Baner, Pune');
    expect(formRef?.getValues()).toMatchObject({ location_id: 'loc-pune', locality: 'Baner' });
  });
});
