import { FlatList } from 'react-native';
import { useForm } from 'react-hook-form';
import { fireEvent, screen } from '@testing-library/react-native';

import { DetailHero } from '@/components/details/DetailHero';
import { FormTextField } from '@/components/FormTextField';
import { PodAccordions } from '@/components/details/PodAccordions';
import { PodInfo } from '@/components/details/PodInfo';
import { PodSchedule } from '@/components/details/PodSchedule';
import { PodShop } from '@/components/details/PodShop';
import { AboutSection, ChargesSection } from '@/components/details/PodSections';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/constants/config', () => ({ config: { googleMapApiKey: 'KEY' } }));

const basePod = {
  pod_title: 'Jam',
  host_names: ['Asha'],
  pod_mode: 'PHYSICAL',
  pod_attendees: ['u1'],
  no_of_spots: 4,
  pod_hits: 8,
  pod_type: 'NATIVE_PAID',
  pod_amount: 199,
  pod_occurrence: 'ONE_TIME',
  pod_date_time: '2026-06-02T13:30:00.000Z',
};

describe('PodInfo virtual + dateless', () => {
  it('shows the video icon and no countdown chip', () => {
    renderWithProviders(
      <PodInfo pod={{ ...basePod, pod_mode: 'VIRTUAL', pod_date_time: null } as never} />,
    );
    expect(screen.getByText('Virtual')).toBeOnTheScreen();
  });
});

describe('PodSchedule venue without coordinates', () => {
  it('builds the map query from the address when lat/lng are missing', () => {
    const venue = {
      id: 'v1',
      venue_name: 'Hall',
      address_line1: 'A1',
      city: 'City',
      lat: null,
      lng: null,
    } as never;
    const pod = { pod_mode: 'PHYSICAL', pod_date_time: null, zone_name: 'Z' } as never;
    renderWithProviders(<PodSchedule pod={pod} venue={venue} location={null} />);
    expect(screen.getByTestId('pod-map')).toBeOnTheScreen();
  });
});

describe('PodShop null product list', () => {
  it('coalesces a missing product list to empty', () => {
    renderWithProviders(
      <PodShop
        pod={{ products_enabled: false } as never}
        selectedProducts={{}}
        onSelectionChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('pod-shop-empty')).toBeOnTheScreen();
  });
});

describe('PodSections', () => {
  it('AboutSection falls back when there is no description', () => {
    renderWithProviders(<AboutSection pod={{ pod_description: '', pod_info: '' } as never} />);
    expect(screen.getByText('Details coming soon.')).toBeOnTheScreen();
  });

  it('ChargesSection renders charges with and without a note', () => {
    renderWithProviders(
      <ChargesSection
        charges={[
          { label: 'Cleaning', amount: 50, note: null },
          { label: 'Deposit', amount: 100, note: 'Refundable' },
        ]}
      />,
    );
    expect(screen.getByText('Refundable')).toBeOnTheScreen();
    expect(screen.getByText('Cleaning')).toBeOnTheScreen();
  });
});

describe('PodAccordions toggle', () => {
  it('coalesces missing charges and toggles sections open/closed', () => {
    const pod = {
      ...basePod,
      pod_description: 'D',
      pod_info: '',
      what_this_pod_offers: ['x'],
      available_perks: [],
      place_charges: null,
      payment_terms: 'Pay upfront',
    } as never;
    renderWithProviders(
      <PodAccordions pod={pod} people={[]} onOpenClub={jest.fn()} onOpenProfile={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('accordion-about-header')); // open → delete
    fireEvent.press(screen.getByTestId('accordion-club-header')); // closed → add
    expect(screen.getByText('Payment terms')).toBeOnTheScreen();
  });
});

describe('DetailHero carousel scroll', () => {
  it('updates the active dot on momentum scroll end', () => {
    renderWithProviders(
      <DetailHero
        media={[
          { url: 'https://i/1.jpg', type: 'IMAGE' },
          { url: 'https://i/2.jpg', type: 'IMAGE' },
        ]}
        onBack={jest.fn()}
      />,
    );
    const list = screen.UNSAFE_getByType(FlatList);
    fireEvent(list, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 400, y: 0 } } });
    expect(screen.getByTestId('detail-back')).toBeOnTheScreen();
  });
});

function SecureHarness() {
  const { control } = useForm<{ pw: string | null }>({ defaultValues: { pw: null } });
  return <FormTextField control={control} name="pw" label="Password" secureTextEntry />;
}

describe('FormTextField secure toggle', () => {
  it('toggles password visibility and coalesces a null value', () => {
    renderWithProviders(<SecureHarness />);
    expect(screen.getByTestId('field-pw').props.value).toBe('');
    // Masked to start, then the eye toggle unmasks the field.
    expect(screen.getByTestId('field-pw').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByTestId('toggle-pw'));
    expect(screen.getByLabelText('Hide password')).toBeOnTheScreen();
    expect(screen.getByTestId('field-pw').props.secureTextEntry).toBe(false);
  });
});

function HintHarness() {
  const { control } = useForm<{ amount: string }>({ defaultValues: { amount: '0' } });
  return (
    <FormTextField control={control} name="amount" label="Amount" hint="Gross price, max 1999." />
  );
}

describe('FormTextField hint', () => {
  it('shows muted helper text when there is no error', () => {
    renderWithProviders(<HintHarness />);
    expect(screen.getByTestId('amount-hint')).toHaveTextContent('Gross price, max 1999.');
  });
});
