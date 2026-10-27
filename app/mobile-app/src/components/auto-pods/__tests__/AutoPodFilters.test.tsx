import { act, fireEvent, screen } from '@testing-library/react-native';

import { AutoPodCategoryChips } from '@/components/auto-pods/AutoPodCategoryChips';
import { AutoPodLocationRow } from '@/components/auto-pods/AutoPodLocationRow';
import { MyHostCategoriesForAutoPodDocument } from '@/graphql/auto-pods';
import { useLocations } from '@/hooks/useLocations';
import { graphqlRequest } from '@/services/graphql.client';
import { autoPodTestLabels as labels } from '@/utils/auto-pod-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useLocations', () => ({ useLocations: jest.fn() }));
jest.mock('@/components/LocationDialog', () => ({
  LocationDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return open ? (
      <Pressable testID="location-dialog" onPress={onClose}>
        <Text>dialog</Text>
      </Pressable>
    ) : null;
  },
}));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const locations = jest.mocked(useLocations);

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
});

describe('AutoPodLocationRow', () => {
  const mountRow = (cityLabel: string) => {
    locations.mockReturnValue({ cityLabel } as unknown as ReturnType<typeof useLocations>);
    renderWithProviders(<AutoPodLocationRow labels={labels} />);
  };

  it('names the chosen city', () => {
    mountRow('Bengaluru');
    expect(screen.getByTestId('auto-pods-location-row')).toHaveTextContent(
      new RegExp(`${labels.locationLabel}: Bengaluru`),
    );
  });

  it('reads as every city when none is chosen', () => {
    mountRow('');
    expect(screen.getByTestId('auto-pods-location-row')).toHaveTextContent(
      new RegExp(`${labels.locationLabel}: ${labels.allLocations}`),
    );
  });

  it('opens the shared location picker from Change and closes it again', () => {
    mountRow('Bengaluru');
    expect(screen.queryByTestId('location-dialog')).toBeNull();
    fireEvent.press(screen.getByTestId('auto-pods-change-location'));
    expect(screen.getByTestId('location-dialog')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('location-dialog'));
    expect(screen.queryByTestId('location-dialog')).toBeNull();
  });
});

describe('AutoPodCategoryChips', () => {
  const category = (id: string | null, sub: string, cat = 'Sports', sup = 'Active') => ({
    sub_category_id: id,
    sub_category_name: sub,
    category_name: cat,
    super_category_name: sup,
  });

  const mount = async (onChange = jest.fn(), value = '') => {
    renderWithProviders(<AutoPodCategoryChips value={value} onChange={onChange} labels={labels} />);
    await act(async () => undefined);
    return onChange;
  };

  it('asks for the host own categories with auth', async () => {
    request.mockResolvedValue({ myHost: { host_categories: [] } });
    await mount();
    expect(request).toHaveBeenCalledWith(MyHostCategoriesForAutoPodDocument, undefined, {
      auth: true,
    });
  });

  it('shows a spinner and only the all chip until the categories are back', async () => {
    request.mockReturnValue(new Promise(() => undefined));
    await mount();
    expect(screen.getByTestId('auto-pods-categories-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pods-category-all')).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-pods-no-categories')).toBeNull();
  });

  it('lists each approved sub-category by its full path and skips rows without an id', async () => {
    request.mockResolvedValue({
      myHost: {
        host_categories: [
          category('run', 'Running', 'Cardio', 'Fitness'),
          category(null, 'Orphan'),
          category('chess', 'Chess', '', 'Games'),
        ],
      },
    });
    await mount();
    expect(screen.queryByTestId('auto-pods-categories-loading')).toBeNull();
    expect(screen.getByText('Fitness › Cardio › Running')).toBeOnTheScreen();
    expect(screen.getByText('Games › Chess')).toBeOnTheScreen();
    expect(screen.queryByText(/Orphan/)).toBeNull();
    expect(screen.queryByTestId('auto-pods-no-categories')).toBeNull();
  });

  it('reports the chosen sub-category, and an empty id for all of them', async () => {
    request.mockResolvedValue({ myHost: { host_categories: [category('run', 'Running')] } });
    const onChange = await mount(jest.fn(), 'run');
    fireEvent.press(screen.getByTestId('auto-pods-category-all'));
    expect(onChange).toHaveBeenLastCalledWith('');
    fireEvent.press(screen.getByTestId('auto-pods-category-run'));
    expect(onChange).toHaveBeenLastCalledWith('run');
  });

  it('says the host has no categories when none come back', async () => {
    request.mockResolvedValue({ myHost: { host_categories: [] } });
    await mount();
    expect(screen.getByTestId('auto-pods-no-categories')).toHaveTextContent(
      labels.noHostCategories,
    );
  });

  it('treats a user who is not a host as having no categories', async () => {
    request.mockResolvedValue({ myHost: null });
    await mount();
    expect(screen.getByTestId('auto-pods-no-categories')).toBeOnTheScreen();
  });

  it('stops the spinner and offers only the all chip when the request fails', async () => {
    request.mockRejectedValue(new Error('network'));
    await mount();
    expect(screen.queryByTestId('auto-pods-categories-loading')).toBeNull();
    expect(screen.getByTestId('auto-pods-category-all')).toBeOnTheScreen();
    expect(screen.getByTestId('auto-pods-no-categories')).toBeOnTheScreen();
  });

  it('ignores a response that lands after the screen is gone', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let finish: (value: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { unmount } = renderWithProviders(
      <AutoPodCategoryChips value="" onChange={jest.fn()} labels={labels} />,
    );
    unmount();
    await act(async () => finish({ myHost: { host_categories: [category('run', 'Running')] } }));
    expect(request).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
