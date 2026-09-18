import { screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { BasicsStep } from '@/components/create-pod/steps/BasicsStep';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodHostCategory,
} from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

// The upload fields have their own specs; stand them in so this one is about
// which sections the basics step shows.
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

const HOST_CATEGORIES: CreatePodHostCategory[] = [
  {
    super_category_id: 'sc-sports',
    super_category_name: 'Sports',
    category_name: 'Running',
    sub_category_name: 'Trail',
  },
];

function Harness({ initial = {} }: Readonly<{ initial?: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  return <BasicsStep form={form} hostCategories={HOST_CATEGORIES} />;
}

describe('BasicsStep', () => {
  it('opens on the title and nudges for a reel', () => {
    renderWithProviders(<Harness />);

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
});
