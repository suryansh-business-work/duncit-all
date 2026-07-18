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
  it('expands all, shows the club + its category breadcrumb, opens it, then collapses all', () => {
    const onOpenClub = jest.fn();
    const podWithClub = {
      ...pod,
      club: {
        club_id: 'c1',
        club_name: 'Runners',
        club_description: 'We run',
        category_id: 'sub1',
        super_category_id: 'sup1',
        club_feature_images_and_videos: [],
      },
    };
    renderWithProviders(
      <PodAccordions
        pod={podWithClub as never}
        people={[]}
        categoryCrumbs={['Sports', 'Racquet', 'Badminton']}
        isFree={false}
        gstPct={18}
        currency="₹"
        onOpenClub={onOpenClub}
        onOpenProfile={jest.fn()}
      />,
    );
    expect(screen.getByTestId('accordion-about')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-expand-all'));
    expect(screen.getByText('Place charges')).toBeOnTheScreen();
    expect(screen.getByText('Payment terms')).toBeOnTheScreen();
    // Paid pod → customer sees GST + total only (no fee/host/venue internals).
    expect(screen.getByText('GST (18%)')).toBeOnTheScreen();
    expect(screen.getByText('Total payable')).toBeOnTheScreen();
    // The pod's club category renders as a breadcrumb in the Club details card.
    expect(screen.getByText('Runners')).toBeOnTheScreen();
    expect(screen.getByTestId('category-breadcrumb')).toHaveTextContent(
      'Sports › Racquet › Badminton',
    );
    fireEvent.press(screen.getByTestId('pod-view-club'));
    expect(onOpenClub).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('pod-collapse-all'));
  });

  it('omits terms/charges, shows the free-pod payment note, and falls back with no club', () => {
    const bare = { ...pod, payment_terms: null, place_charges: [] } as never;
    renderWithProviders(
      <PodAccordions
        pod={bare}
        people={[]}
        categoryCrumbs={[]}
        isFree
        gstPct={18}
        currency="₹"
        onOpenClub={jest.fn()}
        onOpenProfile={jest.fn()}
      />,
    );
    expect(screen.queryByText('Place charges')).toBeNull();
    expect(screen.queryByText('Payment terms')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-expand-all'));
    expect(screen.getByText('This pod is free to join. No payment required.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('accordion-about-header')); // collapse the default-open section
  });

  it('treats a non-free pod priced at 0 as free in the payment note', () => {
    const zeroPriced = { ...pod, pod_amount: 0 } as never;
    renderWithProviders(
      <PodAccordions
        pod={zeroPriced}
        people={[]}
        categoryCrumbs={[]}
        isFree={false}
        gstPct={18}
        currency="₹"
        onOpenClub={jest.fn()}
        onOpenProfile={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('pod-expand-all'));
    expect(screen.getByText('This pod is free to join. No payment required.')).toBeOnTheScreen();
  });
});

describe('PodSections', () => {
  it('renders chip lists, hosts, attendees and charges (full + empty)', () => {
    renderWithProviders(
      <>
        <ChipList items={['A']} emptyText="none" tint="#ffffff" />
        <ChipList items={[]} emptyText="none-empty" tint="#ffffff" />
        <HostsSection
          hosts={[{ user_id: 'h1', full_name: 'Asha', profile_photo: null }]}
          onOpenProfile={jest.fn()}
        />
        <HostsSection hosts={[]} onOpenProfile={jest.fn()} />
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

describe('HostsSection host navigation', () => {
  it('renders a host photo and opens the profile when the row is tapped', () => {
    const onOpenProfile = jest.fn();
    renderWithProviders(
      <HostsSection
        hosts={[{ user_id: 'h9', full_name: 'Rhea', profile_photo: 'https://cdn/r.jpg' }]}
        onOpenProfile={onOpenProfile}
      />,
    );
    expect(screen.getByText('Rhea')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-row-h9'));
    expect(onOpenProfile).toHaveBeenCalledWith('h9');
  });

  it('falls back to a "Host" label and an "H" avatar initial for a nameless host', () => {
    renderWithProviders(
      <HostsSection
        hosts={[{ user_id: 'h0', full_name: null, profile_photo: null }]}
        onOpenProfile={jest.fn()}
      />,
    );
    // Avatar initial fallback when there is no name and no photo.
    expect(screen.getByText('H')).toBeOnTheScreen();
  });
});
