import { useForm } from 'react-hook-form';
import { screen } from '@testing-library/react-native';

import { WhenWhereStep } from '@/components/create-pod/steps/WhenWhereStep';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

const clubs = [{ id: 'c1', club_name: 'Runners', meetup_venues_id: ['v1'] }];
const venues = [
  {
    id: 'v1',
    venue_name: 'Hall',
    city: 'Pune',
    locality: null,
    address_line1: null,
    state: null,
    postal_code: null,
    country: null,
  },
];

function WhenWhereHarness({ initial }: { initial: Partial<CreatePodFormValues> }) {
  const form = useForm<CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return <WhenWhereStep form={form} clubs={clubs} venues={venues} />;
}

describe('WhenWhereStep', () => {
  it('shows the empty-venue hint when the selected club has no linked venues', () => {
    renderWithProviders(
      <WhenWhereHarness initial={{ pod_mode: 'PHYSICAL', club_id: 'unknown' }} />,
    );
    expect(screen.getByTestId('create-pod-venue-empty')).toBeOnTheScreen();
  });
});
