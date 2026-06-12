import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { Accordion } from '@/components/details/Accordion';
import { PodAccordions } from '@/components/details/PodAccordions';
import {
  AttendeesSection,
  ChargesSection,
  ChipList,
  HostsSection,
} from '@/components/details/PodSections';
import { renderWithProviders } from '@/utils/test-utils';

const pod = {
  pod_description: 'desc',
  pod_info: 'info',
  what_this_pod_offers: ['Music'],
  available_perks: ['Snacks'],
  host_names: ['Asha'],
  pod_attendees: ['u1', 'u2'],
  no_of_spots: 5,
  pod_amount: 200,
  pod_type: 'NATIVE_PAID',
  pod_occurrence: 'ONE_TIME',
  payment_terms: 'Pay at venue',
  place_charges: [{ label: 'Entry', amount: 100, note: 'per head' }],
};

describe('Accordion', () => {
  it('toggles open and closed', () => {
    const onToggle = jest.fn();
    const { rerender } = renderWithProviders(
      <Accordion title="A" icon="info" open={false} onToggle={onToggle} testID="acc">
        <Text>body</Text>
      </Accordion>,
    );
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.press(screen.getByTestId('acc-header'));
    expect(onToggle).toHaveBeenCalled();
    rerender(
      <Accordion title="A" icon="info" open onToggle={onToggle} testID="acc">
        <Text>body</Text>
      </Accordion>,
    );
    expect(screen.getByText('body')).toBeOnTheScreen();
  });
});

describe('PodAccordions', () => {
  it('expands all, opens the club, then collapses all', () => {
    const onOpenClub = jest.fn();
    renderWithProviders(
      <PodAccordions
        pod={pod as never}
        people={[]}
        onOpenClub={onOpenClub}
        onOpenProfile={jest.fn()}
      />,
    );
    expect(screen.getByTestId('accordion-about')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-expand-all'));
    expect(screen.getByText('Place charges')).toBeOnTheScreen();
    expect(screen.getByText('Payment terms')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-view-club'));
    expect(onOpenClub).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('pod-collapse-all'));
  });

  it('omits terms/charges when absent and toggles a section header', () => {
    const bare = { ...pod, payment_terms: null, place_charges: [] } as never;
    renderWithProviders(
      <PodAccordions pod={bare} people={[]} onOpenClub={jest.fn()} onOpenProfile={jest.fn()} />,
    );
    expect(screen.queryByText('Place charges')).toBeNull();
    expect(screen.queryByText('Payment terms')).toBeNull();
    fireEvent.press(screen.getByTestId('accordion-about-header')); // collapse the default-open section
  });
});

describe('PodSections', () => {
  it('renders chip lists, hosts, attendees and charges (full + empty)', () => {
    renderWithProviders(
      <>
        <ChipList items={['A']} emptyText="none" tint="#ffffff" />
        <ChipList items={[]} emptyText="none-empty" tint="#ffffff" />
        <HostsSection hosts={['Asha']} />
        <HostsSection hosts={[]} />
        <AttendeesSection
          people={[
            { user_id: 'u1', full_name: 'Asha H', profile_photo: null, is_host: true },
            { user_id: 'u2', full_name: null, profile_photo: 'https://cdn/p.jpg', is_host: false },
          ]}
          spots={5}
          onOpenProfile={jest.fn()}
        />
        <AttendeesSection people={[]} spots={0} onOpenProfile={jest.fn()} />
        <ChargesSection charges={[{ label: 'Entry', amount: 100, note: 'x' }]} />
      </>,
    );
    expect(screen.getByText('none-empty')).toBeOnTheScreen();
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    expect(screen.getByText('Entry')).toBeOnTheScreen();
  });
});
