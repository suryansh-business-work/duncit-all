import { screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { BasicsStep } from '@/components/create-pod/steps/BasicsStep';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodHostCategory,
  type CreatePodLocation,
} from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

// The upload fields and the locality section have their own specs; stand them
// in so this one is about which sections step 1 shows.
jest.mock('@/components/create-pod/MediaUploadField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return { MediaUploadField: () => <Text testID="stub-media-upload">media</Text> };
});
jest.mock('@/components/create-pod/ReelUploadField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return { ReelUploadField: () => <Text testID="stub-reel-upload">reel</Text> };
});
jest.mock('@/components/create-pod/steps/LocalityField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    LocalityField: ({ locations }: { locations: { location_name: string }[] }) => (
      <Text testID="stub-locality">
        {locations.map((location) => location.location_name).join(', ')}
      </Text>
    ),
  };
});

const LOCATIONS: CreatePodLocation[] = [
  { id: 'loc-lucknow', location_name: 'Lucknow', city: 'Lucknow', state: 'Uttar Pradesh' },
  { id: 'loc-pune', location_name: 'Pune', city: 'Pune', state: 'Maharashtra' },
];
const HOST_CATEGORIES: CreatePodHostCategory[] = [
  {
    super_category_id: 'sc-sports',
    super_category_name: 'Sports',
    category_name: 'Running',
    sub_category_name: 'Trail',
  },
];

function Harness({
  showCategory,
  initial = {},
}: Readonly<{ showCategory?: boolean; initial?: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return (
    <BasicsStep
      form={form}
      hostCategories={HOST_CATEGORIES}
      locations={LOCATIONS}
      showCategory={showCategory}
    />
  );
}

describe('BasicsStep', () => {
  it('puts the locality right under the category for a host', () => {
    renderWithProviders(<Harness />);

    expect(screen.getByText('Sports › Running › Trail')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-locality')).toHaveTextContent('Lucknow, Pune');
    expect(screen.getByTestId('field-pod_title')).toBeOnTheScreen();
    expect(screen.getByTestId('create-pod-reel-engagement')).toBeOnTheScreen();
  });

  it('stops nudging for a reel once the pod has one', () => {
    renderWithProviders(
      <Harness initial={{ reel_url: 'https://ik.imagekit.io/duncit/pods/reel.mp4' }} />,
    );

    expect(screen.queryByTestId('create-pod-reel-engagement')).toBeNull();
    expect(screen.getByTestId('stub-reel-upload')).toBeOnTheScreen();
  });

  it("drops both picks for a Club Admin, whose pod is pinned to the club's own", () => {
    renderWithProviders(<Harness showCategory={false} />);

    expect(screen.queryByTestId('create-pod-category-label')).toBeNull();
    expect(screen.queryByTestId('stub-locality')).toBeNull();
    expect(screen.getByTestId('field-pod_title')).toBeOnTheScreen();
  });
});
