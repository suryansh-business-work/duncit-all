import { fireEvent, screen } from '@testing-library/react-native';

import type { PodDetail } from '@/hooks/useDetails';
import { usePodRentals } from '@/hooks/usePodRentals';
import { PodShopSection } from '@/screens/PodDetailsScreen/PodShopSection';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePodRentals', () => ({ usePodRentals: jest.fn() }));

// The shop's own rows are tested with PodShop; here only what it is handed matters.
type ShopProps = {
  embedded: boolean;
  readOnly: boolean;
  onVariantQuantity: (row: unknown, variant: unknown, quantity: number) => void;
};
const mockShopProps: ShopProps[] = [];
jest.mock('@/components/details/PodShop', () => {
  const { createElement } = jest.requireActual('react');
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    PodShop: (props: ShopProps) => {
      mockShopProps.push(props);
      return createElement(
        MockText,
        { testID: props.embedded ? 'shop-embedded' : 'shop-standalone' },
        'shop',
      );
    },
  };
});

const mockRentals = usePodRentals as jest.Mock;

/** What the first PodShop on screen was handed. */
const firstShop = (): ShopProps => {
  const props = mockShopProps[0];
  if (!props) throw new Error('PodShop was not rendered');
  return props;
};

const ITEM = {
  id: 'racket',
  name: 'Racket',
  description: '',
  images: [],
  unit: 'SLOT',
  rate: 100,
  deposit: 0,
  available: 2,
  per_guest_limit: 1,
};
const withItems = (items: unknown[]) =>
  mockRentals.mockReturnValue({
    catalogue: {
      open: true,
      closed_reason: null,
      hours: 2,
      currency_symbol: '₹',
      venue_terms_html: '',
      items,
    },
    settings: null,
    failed: false,
    loading: false,
    refetch: jest.fn(),
  });

const pod = (over: Record<string, unknown> = {}) =>
  ({
    id: 'pod-1',
    pod_title: 'Sunday Smash',
    club_slug: 'smashers',
    pod_mode: 'PHYSICAL',
    venue_id: 'v1',
    products_enabled: true,
    product_requests: [{ product_id: 'p1', product_name: 'Tee' }],
    ...over,
  }) as unknown as PodDetail;

const renderSection = (podValue: PodDetail, showProducts = true, onVariantQuantity = jest.fn()) =>
  renderWithProviders(
    <PodShopSection
      pod={podValue}
      showProducts={showProducts}
      selectedProducts={{}}
      onSelectionChange={jest.fn()}
      selectedTotal={0}
      onVariantQuantity={onVariantQuantity}
      seats={1}
    />,
  );

beforeEach(() => {
  mockRentals.mockReset();
  mockShopProps.length = 0;
});

describe('PodShopSection', () => {
  it('shows the Pod Shop | Pod Rent card when the venue rents things and the pod sells products', () => {
    withItems([ITEM]);
    renderSection(pod());
    expect(mockRentals).toHaveBeenCalledWith('pod-1', true);
    expect(screen.getByTestId('pod-shop-rent')).toBeOnTheScreen();
    expect(screen.getByTestId('shop-embedded')).toBeOnTheScreen();
  });

  it('shows the rent card on its own when the shop is gated off — the flag never hides rentals', () => {
    withItems([ITEM]);
    renderSection(pod(), false);
    expect(screen.getByTestId('pod-shop-rent')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-shop-rent-tab-shop')).toBeNull();
    expect(screen.queryByTestId('shop-embedded')).toBeNull();
  });

  it('keeps the plain shop card when the venue rents nothing', () => {
    withItems([]);
    renderSection(pod());
    expect(screen.queryByTestId('pod-shop-rent')).toBeNull();
    expect(screen.getByTestId('shop-standalone')).toBeOnTheScreen();
  });

  it('renders nothing with neither products nor rentals', () => {
    withItems([]);
    renderSection(pod({ product_requests: [] }));
    expect(screen.queryByTestId('shop-standalone')).toBeNull();
    expect(screen.queryByTestId('pod-shop-rent')).toBeNull();
  });

  it('ignores product requests that name no product yet', () => {
    withItems([]);
    renderSection(pod({ product_requests: [{ product_id: 'p1', product_name: '' }] }));
    expect(screen.queryByTestId('shop-standalone')).toBeNull();
    expect(mockShopProps).toHaveLength(0);
  });

  it('never rents for a virtual pod or a pod with no venue, whatever the catalogue holds', () => {
    withItems([ITEM]);
    renderSection(pod({ pod_mode: 'VIRTUAL', product_requests: null }));
    expect(mockRentals).toHaveBeenLastCalledWith('pod-1', false);
    expect(screen.queryByTestId('pod-shop-rent')).toBeNull();

    renderSection(pod({ venue_id: null }));
    expect(mockRentals).toHaveBeenLastCalledWith('pod-1', false);
    expect(screen.getByTestId('shop-standalone')).toBeOnTheScreen();
  });

  it('turns a variant pick into a cart line carrying the pod, using the row’s photo when the variant has none', () => {
    withItems([]);
    const onVariantQuantity = jest.fn();
    renderSection(pod(), true, onVariantQuantity);
    const row = {
      product_id: 'p1',
      product_name: 'Tee',
      image_url: 'row.jpg',
      free_delivery_above: undefined,
    };
    const variant = { id: 'v-m', label: 'M', image_url: '', unit_cost: 499, max: 3 };

    firstShop().onVariantQuantity(row, variant, 2);

    expect(onVariantQuantity).toHaveBeenCalledWith(
      {
        pod_id: 'pod-1',
        pod_title: 'Sunday Smash',
        club_slug: 'smashers',
        product_id: 'p1',
        variant_id: 'v-m',
        variant_label: 'M',
        product_name: 'Tee',
        image_url: 'row.jpg',
        unit_cost: 499,
        max_quantity: 3,
        free_delivery_above: null,
      },
      2,
    );
    firstShop().onVariantQuantity(
      { ...row, free_delivery_above: 999 },
      { ...variant, image_url: 'v.jpg' },
      1,
    );
    expect(onVariantQuantity).toHaveBeenLastCalledWith(
      expect.objectContaining({ image_url: 'v.jpg', free_delivery_above: 999 }),
      1,
    );
  });

  it('lists the shop read-only once the host turned products off for the pod', () => {
    withItems([]);
    renderSection(pod({ products_enabled: false }));
    expect(firstShop().readOnly).toBe(true);
  });

  it('titles the see-all sheet with an empty name rather than crashing on an untitled pod', () => {
    withItems([ITEM]);
    renderSection(pod({ pod_title: null }));
    fireEvent.press(screen.getByTestId('pod-shop-rent-see-all'));
    expect(screen.getByTestId('pod-shop-rent-sheet')).toBeOnTheScreen();
    expect(screen.getByText(/Shop and rent for\s*$/)).toBeOnTheScreen();
  });
});
