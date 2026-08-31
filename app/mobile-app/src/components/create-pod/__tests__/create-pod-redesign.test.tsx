import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { createPodSchema } from '@/components/create-pod/create-pod.form';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { renderWithProviders } from '@/utils/test-utils';

function PodTypeHarness({ initial }: Readonly<{ initial: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return (
    <>
      <PodTypeCards form={form} />
      <Text testID="pt-readout">{form.watch('pod_type')}</Text>
    </>
  );
}

// Same resolver the stepper uses, so the rendered error is the schema's own copy.
function PodTypeErrorHarness() {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    resolver: zodResolver(createPodSchema),
    defaultValues: { ...blankCreatePodForm, pod_mode: 'PHYSICAL', pod_type: 'FREE' },
  });
  return (
    <>
      <PodTypeCards form={form} />
      <Text testID="pt-validate" onPress={() => fireAndForget(form.trigger('pod_type'))}>
        validate
      </Text>
    </>
  );
}

describe('PodTypeCards', () => {
  it('switches between the free and paid families and no-ops on the same family', () => {
    // FREE is virtual-only, so the harness must be VIRTUAL for both cards to exist.
    renderWithProviders(<PodTypeHarness initial={{ pod_mode: 'VIRTUAL', pod_type: 'FREE' }} />);
    fireEvent.press(screen.getByTestId('create-pod-paid'));
    expect(screen.getByTestId('pt-readout')).toHaveTextContent('PAID');
    fireEvent.press(screen.getByTestId('create-pod-free'));
    expect(screen.getByTestId('pt-readout')).toHaveTextContent('FREE');
    // Pressing the already-selected family is a no-op.
    fireEvent.press(screen.getByTestId('create-pod-free'));
    expect(screen.getByTestId('pt-readout')).toHaveTextContent('FREE');
  });

  it('hides the Free card for a physical pod — physical pods are always paid', () => {
    renderWithProviders(<PodTypeHarness initial={{ pod_mode: 'PHYSICAL', pod_type: 'PAID' }} />);
    expect(screen.queryByTestId('create-pod-free')).toBeNull();
    expect(screen.getByTestId('create-pod-paid')).toBeTruthy();
  });

  it('surfaces the pod-type validation error under the cards', async () => {
    renderWithProviders(<PodTypeErrorHarness />);
    expect(screen.queryByTestId('pod_type-error')).toBeNull();
    fireEvent.press(screen.getByTestId('pt-validate'));
    expect(await screen.findByTestId('pod_type-error')).toHaveTextContent(
      'Physical pods must be Paid',
    );
  });
});

function SpotsHarness({
  initial = '0',
  err,
  slider,
}: Readonly<{ initial?: string; err?: string; slider?: { min: number; max: number } }>) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <SpotsStepper
        value={value}
        onChange={setValue}
        error={err}
        min={slider?.min}
        max={slider?.max}
        slidable={!!slider}
        boundsHint={slider ? `This activity needs at least ${slider.min}.` : undefined}
      />
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
    // Non-digits are stripped — spots are whole seats, so "2.5"/"12abc" can
    // never feed a fractional collection into the earnings preview.
    fireEvent.changeText(screen.getByTestId('field-no_of_spots_text'), '2.5');
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('25');
    fireEvent.changeText(screen.getByTestId('field-no_of_spots_text'), '12abc');
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('12');
  });

  it('treats a non-numeric value as the minimum and renders the error', () => {
    renderWithProviders(<SpotsHarness initial="" err="Spots required" />);
    expect(screen.getByTestId('no_of_spots_text-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('spots-inc'));
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('1');
  });

  // With an admin-set minimum and a booked venue space, the host picks anywhere
  // between the two instead of being stuck on the venue's capacity.
  it('renders the slider between the minimum and the venue capacity', () => {
    renderWithProviders(<SpotsHarness initial="10" slider={{ min: 4, max: 30 }} />);
    expect(screen.getByTestId('create-pod-spots-value')).toHaveTextContent('10');
    expect(screen.getByTestId('create-pod-spots-bounds')).toHaveTextContent(/at least 4/);
    // The stepper controls give way to the slider.
    expect(screen.queryByTestId('spots-inc')).toBeNull();

    fireEvent(screen.getByTestId('create-pod-spots-slider'), 'valueChange', [18]);
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('18');
  });

  it('clamps a slider value to the bounds and survives an empty change', () => {
    renderWithProviders(<SpotsHarness initial="10" slider={{ min: 4, max: 30 }} />);
    const slider = screen.getByTestId('create-pod-spots-slider');
    fireEvent(slider, 'valueChange', [99]);
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('30');
    fireEvent(slider, 'valueChange', [1]);
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('4');
    // A change with no value falls back to the floor rather than NaN.
    fireEvent(slider, 'valueChange', []);
    expect(screen.getByTestId('sp-readout')).toHaveTextContent('4');
  });

  it('shows the slider error and omits the hint when none is given', () => {
    renderWithProviders(
      <SpotsStepper value="10" onChange={jest.fn()} error="Too few" min={4} max={30} slidable />,
    );
    expect(screen.getByTestId('no_of_spots_text-error')).toHaveTextContent('Too few');
    expect(screen.queryByTestId('create-pod-spots-bounds')).toBeNull();
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
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm } });
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
      whole_day: false,
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
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
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
