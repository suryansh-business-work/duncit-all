/**
 * "Pick This Venue for Pod" on Venue Details: Create Pod keeps the picked venue
 * physical, offers it alone on Where & when, keeps it through a category
 * change and picks the club when only one is around it. mWeb twin:
 * createPodPickedVenue.test.
 */
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { screen, waitFor } from '@testing-library/react-native';
import { hostCategoryKeyOf } from '@duncit/utils';

import { WhatStep } from '@/components/create-pod/steps/WhatStep';
import { WhereWhenStep } from '@/components/create-pod/steps/WhereWhenStep';
import { PickedVenueNote } from '@/components/create-pod/PickedVenueNote';
import {
  blankCreatePodForm,
  type CreatePodClub,
  type CreatePodFormValues,
  type CreatePodVenue,
} from '@/components/create-pod/create-pod.types';
import { pickedVenueFreshSeed, pickedVenueOf } from '@/hooks/pickedVenuePrefill';
import { renderWithProviders } from '@/utils/test-utils';

const mockSeen: { slot?: { venues: CreatePodVenue[] }; category?: { keepVenue?: boolean } } = {};
jest.mock('@/components/create-pod/steps/LocationClubStep', () => ({ LocationClubStep: () => null }));
jest.mock('@/components/create-pod/steps/PodSpotsField', () => ({ PodSpotsField: () => null }));
jest.mock('@/components/create-pod/steps/VenueSlotStep', () => ({
  VenueSlotStep: (p: { venues: CreatePodVenue[] }) => {
    mockSeen.slot = p;
    return null;
  },
}));
jest.mock('@/components/create-pod/steps/HostCategoryField', () => ({
  HostCategoryField: (p: { keepVenue?: boolean }) => {
    mockSeen.category = p;
    return null;
  },
}));
jest.mock('@/components/create-pod/steps/PodModeField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return { PodModeField: () => <Text testID="pod-mode-field">mode</Text> };
});

const venue = (id: string, over: Partial<CreatePodVenue> = {}) =>
  ({ id, venue_name: `Venue ${id}`, location_id: 'loc1', locality: 'Baner', ...over }) as CreatePodVenue;
const club = (id: string) => ({ id, club_name: id }) as CreatePodClub;
const badminton = {
  super_category_id: 's1',
  super_category_name: 'For You',
  category_id: 'c1',
  category_name: 'Sports',
  sub_category_id: 'u1',
  sub_category_name: 'Badminton',
};

type Form = ReturnType<typeof useForm<CreatePodFormValues>>;
let form: Form;
function Harness({ values, children }: Readonly<{ values: Partial<CreatePodFormValues>; children: (f: Form) => ReactNode }>) {
  form = useForm<CreatePodFormValues>({ defaultValues: { ...blankCreatePodForm, ...values } });
  return <>{children(form)}</>;
}

const onPicked = { pod_mode: 'PHYSICAL' as const, location_id: 'loc1', venue_id: 'v1' };
const venues = [venue('v1'), venue('v2')];

beforeEach(() => {
  mockSeen.slot = undefined;
  mockSeen.category = undefined;
});

const where = (values: Partial<CreatePodFormValues>, clubs: CreatePodClub[], pickedVenueId?: string) =>
  renderWithProviders(
    <Harness values={values}>
      {(f) => (
        <WhereWhenStep
          form={f}
          clubs={clubs}
          cityClubs={clubs}
          locations={[]}
          venues={venues}
          clubVenueIds={new Set(['v2'])}
          currencySymbol="₹"
          pinnedVenueId={pickedVenueId}
          pickedVenueId={pickedVenueId}
          venueNotice={{} as never}
          spots={{ min: 1, max: 40, slidable: true }}
          offerMinGuests={0}
          pinnedClub={null}
        />
      )}
    </Harness>,
  );

describe('What on the picked venue', () => {
  const what = (values: Partial<CreatePodFormValues>, pickedVenueId?: string) =>
    renderWithProviders(
      <Harness values={values}>
        {(f) => (
          <WhatStep form={f} hostCategories={[]} clubs={[]} pinnedClub={false} venues={venues} pickedVenueId={pickedVenueId} />
        )}
      </Harness>,
    );

  it('drops the mode choice, names the venue and keeps it through a category change', () => {
    what(onPicked, 'v1');
    expect(screen.queryByTestId('pod-mode-field')).toBeNull();
    expect(screen.getByTestId('create-pod-picked-venue')).toHaveTextContent(/A physical pod at Venue v1/);
    expect(mockSeen.category?.keepVenue).toBe(true);
  });

  it('keeps the mode choice once the venue changed, and for any other pod', () => {
    what({ ...onPicked, venue_id: 'v2' }, 'v1');
    expect(screen.getByTestId('pod-mode-field')).toBeTruthy();
    expect(mockSeen.category?.keepVenue).toBe(false);
    what(onPicked);
    expect(screen.queryByTestId('create-pod-picked-venue')).toBeNull();
  });
});

describe('Where & when on the picked venue', () => {
  it('offers the picked venue alone and picks the only club around it', async () => {
    where({ ...onPicked, club_id: '' }, [club('k1')], 'v1');
    await waitFor(() => expect(form.getValues('club_id')).toBe('k1'));
    expect(mockSeen.slot?.venues.map((v) => v.id)).toEqual(['v1']);
    expect(screen.getByTestId('create-pod-picked-venue')).toBeTruthy();
  });

  it('leaves the club to the host when there is a choice', async () => {
    where({ ...onPicked, club_id: '' }, [club('k1'), club('k2')], 'v1');
    await waitFor(() => expect(screen.getByTestId('create-pod-picked-venue')).toBeTruthy());
    expect(form.getValues('club_id')).toBe('');
  });

  it("offers every venue and picks no club for an ordinary pod", async () => {
    where({ ...onPicked, club_id: 'k9' }, [club('k1')]);
    await waitFor(() => expect(mockSeen.slot?.venues.map((v) => v.id)).toEqual(['v1', 'v2']));
    expect(form.getValues('club_id')).toBe('k9');
    expect(screen.queryByTestId('create-pod-picked-venue')).toBeNull();
  });
});

describe('PickedVenueNote', () => {
  it('names nothing for a venue it cannot find', () => {
    renderWithProviders(<PickedVenueNote venues={venues} venueId="gone" />);
    expect(screen.queryByTestId('create-pod-picked-venue')).toBeNull();
  });
});

describe('pickedVenuePrefill', () => {
  it('finds the picked venue unless a Pod Request brings its own, or it is not offered', () => {
    expect(pickedVenueOf('v2', '', venues)?.id).toBe('v2');
    expect(pickedVenueOf('v2', 'req1', venues)).toBeNull();
    expect(pickedVenueOf('gone', '', venues)).toBeNull();
    expect(pickedVenueOf('', '', venues)).toBeNull();
  });

  it('opens on Where & when with the category picked for a one-category host, else on What', () => {
    const cities = [{ id: 'loc1', location_name: 'Pune', location_zones: [{ zone_name: 'Baner' }] }] as never;
    expect(pickedVenueFreshSeed(venue('v1'), cities, [badminton] as never)).toEqual({
      values: { pod_mode: 'PHYSICAL', venue_id: 'v1', location_id: 'loc1', locality: 'Baner', host_category_key: hostCategoryKeyOf(badminton) },
      step: 1,
    });
    expect(pickedVenueFreshSeed(venue('v1'), cities, [badminton, { ...badminton, sub_category_id: 'u2' }] as never).step).toBe(0);
  });
});
