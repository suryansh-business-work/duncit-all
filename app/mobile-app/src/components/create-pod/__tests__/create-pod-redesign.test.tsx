import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Text, XStack } from 'tamagui';

import { OptionalSettingsCards } from '@/components/create-pod/OptionalSettingsCards';
import { PodTypeCards } from '@/components/create-pod/PodTypeCards';
import { SlotPicker } from '@/components/create-pod/SlotPicker';
import { SpotsStepper } from '@/components/create-pod/SpotsStepper';
import { TermsAgreement } from '@/components/create-pod/TermsAgreement';
import { VenueContactCard } from '@/components/create-pod/VenueContactCard';
import { VenuePicker } from '@/components/create-pod/VenuePicker';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

function PodTypeHarness({ initial }: Readonly<{ initial: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return (
    <>
      <PodTypeCards form={form} />
      <Text testID="pt-readout">{form.watch('pod_type')}</Text>
    </>
  );
}

describe('PodTypeCards', () => {
  it('switches between the free and paid families and no-ops on the same family', () => {
    renderWithProviders(<PodTypeHarness initial={{ pod_type: 'NATIVE_FREE' }} />);
    fireEvent.press(screen.getByTestId('create-pod-paid'));
    expect(screen.getByTestId('pt-readout')).toHaveTextContent('NATIVE_PAID');
    fireEvent.press(screen.getByTestId('create-pod-free'));
    expect(screen.getByTestId('pt-readout')).toHaveTextContent('NATIVE_FREE');
    // Pressing the already-selected family is a no-op.
    fireEvent.press(screen.getByTestId('create-pod-free'));
    expect(screen.getByTestId('pt-readout')).toHaveTextContent('NATIVE_FREE');
  });
});

function SpotsHarness({ initial = '0', err }: Readonly<{ initial?: string; err?: string }>) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <SpotsStepper value={value} onChange={setValue} error={err} />
      <Text testID="sp-readout">{value}</Text>
    </>
  );
}

describe('SpotsStepper', () => {
  it('increments, clamps decrement at the minimum and accepts typed values', () => {
    renderWithProviders(<SpotsHarness />);
    fireEvent.press(screen.getByTestId('spots-inc'));
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('1');
    fireEvent.press(screen.getByTestId('spots-dec'));
    fireEvent.press(screen.getByTestId('spots-dec'));
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('0');
    fireEvent.changeText(screen.getByTestId('field-no_of_spots_text'), '25');
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('25');
  });

  it('treats a non-numeric value as the minimum and renders the error', () => {
    renderWithProviders(<SpotsHarness initial="" err="Spots required" />);
    expect(screen.getByTestId('no_of_spots_text-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('spots-inc'));
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('1');
  });

  it('renders a static read-only value with no stepper controls when readOnly', () => {
    renderWithProviders(<SpotsStepper value="42" onChange={jest.fn()} readOnly />);
    expect(screen.getByTestId('create-pod-spots-readonly')).toHaveTextContent('42');
    expect(screen.getByText('Set by the venue space you picked.')).toBeOnTheScreen();
    expect(screen.queryByTestId('spots-inc')).toBeNull();
    expect(screen.queryByTestId('field-no_of_spots_text')).toBeNull();
  });
});

function TermsHarness() {
  const form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm } });
  return (
    <>
      <TermsAgreement form={form} />
      <XStack
        testID="terms-force-error"
        role="button"
        aria-label="force"
        onPress={() =>
          form.setError('agreed_to_terms', {
            type: 'manual',
            message: 'Accept the Organizer Terms',
          })
        }
      />
    </>
  );
}

describe('TermsAgreement', () => {
  it('toggles the gate, opens the terms link and surfaces the error', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    renderWithProviders(<TermsHarness />);
    fireEvent.press(screen.getByTestId('create-pod-terms'));
    fireEvent.press(screen.getByTestId('terms-link'));
    expect(openURL).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('terms-force-error'));
    expect(screen.getByTestId('agreed_to_terms-error')).toBeOnTheScreen();
    openURL.mockRestore();
  });
});

describe('SlotPicker day labels', () => {
  it('labels a slot dated today as "Today"', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const todaySlot = {
      id: 'today1',
      start_at: noon.toISOString(),
      end_at: noon.toISOString(),
      price: 0,
      space_label: '',
      capacity: 20,
      status: 'AVAILABLE',
    };
    renderWithProviders(
      <SlotPicker slots={[todaySlot]} loading={false} selectedSlotId="" onPick={jest.fn()} />,
    );
    expect(screen.getByTestId('create-pod-slot-today1')).toBeOnTheScreen();
  });
});

describe('VenuePicker', () => {
  it('renders the "Select venue" label and the validation error under the card rail', () => {
    renderWithProviders(
      <VenuePicker
        venues={[{ id: 'v1', venue_name: 'Hall' }]}
        selectedId=""
        onSelect={jest.fn()}
        error="Select a venue"
      />,
    );
    expect(screen.getByText('Select venue')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-venue-error')).toBeOnTheScreen();
  });

  it('shows the default empty hint when no venue matches the club', () => {
    renderWithProviders(<VenuePicker venues={[]} selectedId="" onSelect={jest.fn()} />);
    expect(screen.getByText('Select venue')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-venue-empty')).toHaveTextContent(
      /No venues match this club yet/,
    );
  });

  it('renders a custom empty hint when provided', () => {
    renderWithProviders(
      <VenuePicker venues={[]} selectedId="" onSelect={jest.fn()} emptyHint="Custom hint" />,
    );
    expect(screen.getByText('Custom hint')).toBeOnTheScreen();
  });
});

describe('VenueContactCard actions', () => {
  it('calls the venue and opens directions', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    renderWithProviders(
      <VenueContactCard
        venue={{ id: 'v1', venue_name: 'Hall', owner_phone: '+911234567890', city: 'Pune' }}
      />,
    );
    fireEvent.press(screen.getByTestId('venue-call'));
    fireEvent.press(screen.getByTestId('venue-directions'));
    expect(openURL).toHaveBeenCalledTimes(2);
    openURL.mockRestore();
  });
});

function OptionalHarness({ initial }: Readonly<{ initial: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return <OptionalSettingsCards form={form} />;
}

describe('OptionalSettingsCards', () => {
  it('reveals the Additional Info field and collapses again when empty', () => {
    renderWithProviders(<OptionalHarness initial={{}} />);
    fireEvent.press(screen.getByTestId('optional-info'));
    expect(screen.getByTestId('field-pod_info')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('optional-info'));
    expect(screen.queryByTestId('field-pod_info')).toBeNull();
  });

  it('shows filled summaries and reveals the perks chip field (offers panel is gone)', () => {
    renderWithProviders(
      <OptionalHarness
        initial={{
          pod_info: 'Bring water',
          available_perks: ['Parking'],
        }}
      />,
    );
    expect(screen.getByText('Added')).toBeOnTheScreen();
    // Only perks carry a chip summary now — the offers panel was moved into Basics.
    expect(screen.getByText('1 added')).toBeOnTheScreen();
    expect(screen.queryByTestId('optional-offers')).toBeNull();
    fireEvent.press(screen.getByTestId('optional-perks'));
    expect(screen.getByTestId('create-pod-perks-input')).toBeOnTheScreen();
  });
});
