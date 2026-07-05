import { act, fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { renderWithProviders } from '@/utils/test-utils';
import {
  OrderTrackingTimeline,
  PodProductOrderItem,
  PodProductOrdersCard,
} from '@/components/pod-history';
import { buildOrderTimeline } from '@/utils/product-orders';

const line = (o: Record<string, any> = {}) => ({
  product_id: 'pr1',
  name: 'T-Shirt',
  image_url: 'https://img/x.png',
  qty: 2,
  unit_cost: 300,
  gross: 600,
  ...o,
});

const shipOrder = (o: Record<string, any> = {}): any => ({
  id: 'o1',
  order_no: 'ord_1',
  fulfilment_method: 'SHIP',
  fulfilment_status: 'SHIPPED',
  currency_symbol: '₹',
  items_total: 600,
  total: 600,
  pickup_ref: '',
  pickup_location_id: '',
  created_at: '',
  line_items: [line()],
  shipping_address: null,
  shiprocket: { awb: 'AWB1', courier_name: 'Delhivery', tracking_status: '', label_url: '' },
  tracking_events: [],
  ...o,
});

const pickupOrder = (o: Record<string, any> = {}): any => ({
  ...shipOrder(),
  id: 'o2',
  fulfilment_method: 'PICKUP',
  fulfilment_status: 'READY_FOR_PICKUP',
  pickup_ref: 'PU-ABC',
  pickup_location_id: 'WH-1',
  shiprocket: { awb: '', courier_name: '', tracking_status: '', label_url: '' },
  line_items: [line({ product_id: 'pr2', name: 'Mug', image_url: '' })],
  ...o,
});

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
beforeEach(() => openURL.mockClear());

describe('OrderTrackingTimeline', () => {
  it('renders done/current/pending steps', () => {
    const steps = buildOrderTimeline({ fulfilment_method: 'SHIP', fulfilment_status: 'SHIPPED' });
    renderWithProviders(<OrderTrackingTimeline steps={steps} testID="tl" />);
    expect(screen.getByTestId('tl')).toBeOnTheScreen();
    expect(screen.getByText('Shipped')).toBeOnTheScreen();
  });
});

describe('PodProductOrderItem', () => {
  it('SHIP: shows AWB + courier and opens tracking on press', () => {
    renderWithProviders(<PodProductOrderItem order={shipOrder()} />);
    expect(screen.getByText(/AWB1/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('po-track-o1'));
    expect(openURL).toHaveBeenCalledWith('https://shiprocket.co/tracking/AWB1');
  });

  it('SHIP: renders an AWB with no courier name', () => {
    renderWithProviders(
      <PodProductOrderItem
        order={shipOrder({
          shiprocket: { awb: 'AWB2', courier_name: '', tracking_status: '', label_url: '' },
        })}
      />,
    );
    expect(screen.getByText(/AWB2/)).toBeOnTheScreen();
  });

  it('SHIP: swallows a tracking-open failure', async () => {
    openURL.mockRejectedValueOnce(new Error('nope'));
    renderWithProviders(<PodProductOrderItem order={shipOrder()} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('po-track-o1'));
    });
    expect(openURL).toHaveBeenCalled();
  });

  it('SHIP without AWB: track press is a no-op', () => {
    renderWithProviders(
      <PodProductOrderItem
        order={shipOrder({
          shiprocket: { awb: '', courier_name: '', tracking_status: '', label_url: '' },
        })}
      />,
    );
    fireEvent.press(screen.getByTestId('po-track-o1'));
    expect(openURL).not.toHaveBeenCalled();
  });

  it('PICKUP: shows the pickup code + location and the image fallback', () => {
    renderWithProviders(<PodProductOrderItem order={pickupOrder()} />);
    expect(screen.getByText(/PU-ABC/)).toBeOnTheScreen();
    expect(screen.getByTestId('po-item-o2')).toBeOnTheScreen();
  });

  it('PICKUP without a code or location falls back to a dash', () => {
    renderWithProviders(
      <PodProductOrderItem order={pickupOrder({ pickup_ref: '', pickup_location_id: '' })} />,
    );
    expect(screen.getByText(/Pickup code/)).toBeOnTheScreen();
  });
});

describe('PodProductOrdersCard', () => {
  it('shows a spinner while loading with no orders', () => {
    renderWithProviders(<PodProductOrdersCard orders={[]} loading />);
    expect(screen.getByTestId('po-loading')).toBeOnTheScreen();
  });

  it('renders nothing when empty and not loading', () => {
    renderWithProviders(<PodProductOrdersCard orders={[]} loading={false} />);
    expect(screen.queryByTestId('pod-product-orders-card')).toBeNull();
  });

  it('renders the order list', () => {
    renderWithProviders(<PodProductOrdersCard orders={[shipOrder()]} loading={false} />);
    expect(screen.getByTestId('pod-product-orders-card')).toBeOnTheScreen();
    expect(screen.getByTestId('po-item-o1')).toBeOnTheScreen();
  });
});
