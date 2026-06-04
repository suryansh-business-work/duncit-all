import { screen } from '@testing-library/react-native';

import {
  DetailSkeleton,
  HomeSkeleton,
  ListSkeleton,
  Skeleton,
  SkeletonCard,
} from '@/components/Skeleton';
import { renderWithProviders } from '@/utils/test-utils';

describe('Skeletons', () => {
  it('render every variant', () => {
    renderWithProviders(
      <>
        <Skeleton testID="sk" />
        <SkeletonCard />
        <ListSkeleton testID="ls" count={2} />
        <HomeSkeleton />
        <DetailSkeleton />
      </>,
    );
    expect(screen.getByTestId('sk')).toBeOnTheScreen();
    expect(screen.getByTestId('ls')).toBeOnTheScreen();
    expect(screen.getByTestId('home-skeleton')).toBeOnTheScreen();
    expect(screen.getByTestId('detail-skeleton')).toBeOnTheScreen();
  });
});
