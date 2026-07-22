import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';

// lottie-react → lottie-web touches canvas getContext at import time (unavailable
// in jsdom); the confetti overlay on the success screen pulls it in. Stub it out.
vi.mock('lottie-react', () => ({ default: () => null }));
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckoutPage from '../CheckoutPage';
import { CartProvider } from '../../../components/cart/CartContext';
import {
  AVAILABLE_COUPONS,
  CHECKOUT_ME,
  CHECKOUT_POD,
  DUMMY_CHECKOUT,
  PREVIEW_COUPON,
  PUBLIC_FINANCE,
} from '../queries';

const POD_ID = 'POD1';

const financeMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: PUBLIC_FINANCE },
  result: {
    data: {
      publicFinanceSettings: {
        platform_fee_pct: 10,
        gst_pct: 18,
        currency_symbol: '₹',
        dummy_mode: true,
        razorpay_enabled: false,
        ...over,
      },
    },
  },
});

const meMock = (): MockedResponse => ({
  request: { query: CHECKOUT_ME },
  result: {
    data: {
      me: {
        user_id: 'u1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone_number: '9876543210',
        phone_extension: '+91',
        address: {
          line1: '221B Baker Street',
          line2: '',
          landmark: '',
          city: 'London',
          state: 'LDN',
          pincode: '123456',
          country: 'India',
        },
      },
    },
  },
});

const podMock = (): MockedResponse => ({
  request: { query: CHECKOUT_POD, variables: { id: POD_ID } },
  result: {
    data: {
      pod: {
        id: 'poddoc1',
        pod_id: POD_ID,
        pod_title: 'Sunset Jam',
        pod_description: 'A jam',
        pod_date_time: '2026-08-01T10:00:00.000Z',
        pod_end_date_time: '2026-08-01T12:00:00.000Z',
        pod_type: 'PUBLIC',
        pod_amount: 1000,
        place_charges: [],
        products_enabled: false,
        product_cost_total: 0,
        product_requests: [],
        zone_name: 'Zone A',
        no_of_spots: 10,
        pod_attendees: 2,
        pod_images_and_videos: [],
        club_id: 'c1',
        location_id: 'l1',
        venue_id: 'v1',
      },
    },
  },
});

const podErrorMock = (): MockedResponse => ({
  request: { query: CHECKOUT_POD, variables: { id: POD_ID } },
  error: new Error('Pod not found'),
});

const couponsMock = (pod_id: string | null): MockedResponse => ({
  request: { query: AVAILABLE_COUPONS, variables: { pod_id } },
  result: { data: { availableCouponsForPod: [] } },
});

function renderCheckout(mocks: MockedResponse[], path = `/checkout/${POD_ID}`) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CartProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<div>HOME</div>} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/:podId" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </MockedProvider>,
  );
}

describe('CheckoutPage', () => {
  it('renders the empty state when there is no pod and no amount', async () => {
    renderCheckout([financeMock(), meMock(), couponsMock(null)], '/checkout');
    expect(await screen.findByText('Nothing to checkout.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(screen.getByText('HOME')).toBeInTheDocument();
  });

  it('shows the loading skeleton first, then the populated checkout with the Dummy gateway', async () => {
    const { container } = renderCheckout([
      financeMock(),
      meMock(),
      podMock(),
      couponsMock(POD_ID),
    ]);
    // Before the queries resolve the skeleton is shown.
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);

    expect(await screen.findByText('Confirm your spot')).toBeInTheDocument();
    expect(screen.getByText('Payment details')).toBeInTheDocument();
    expect(screen.getByText('Sunset Jam')).toBeInTheDocument();
    // Gateway badge (dummy_mode on, razorpay off).
    expect(screen.getByText('Dummy')).toBeInTheDocument();
    expect(screen.getByText('Total payable')).toBeInTheDocument();
  });

  it('shows the Razorpay gateway badge when razorpay is the live gateway', async () => {
    renderCheckout([
      financeMock({ razorpay_enabled: true, dummy_mode: false }),
      meMock(),
      podMock(),
      couponsMock(POD_ID),
    ]);
    expect(await screen.findByText('Razorpay')).toBeInTheDocument();
  });

  it('surfaces a pod load error as an alert', async () => {
    renderCheckout([
      financeMock(),
      meMock(),
      podErrorMock(),
      couponsMock(POD_ID),
    ]);
    expect(await screen.findByText('Pod not found')).toBeInTheDocument();
  });

  it('runs the back button without crashing', async () => {
    renderCheckout([financeMock(), meMock(), podMock(), couponsMock(POD_ID)]);
    await screen.findByText('Confirm your spot');
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    // Single history entry: still on the checkout screen.
    expect(screen.getByText('Confirm your spot')).toBeInTheDocument();
  });

  it('applies a valid coupon and shows the applied state', async () => {
    const previewMock: MockedResponse = {
      request: { query: PREVIEW_COUPON },
      variableMatcher: () => true,
      result: {
        data: {
          previewCoupon: {
            ok: true,
            message: null,
            code: 'SAVE10',
            discount_pct: 10,
            original_total: 1000,
            discount_amount: 100,
            final_total: 900,
            currency_symbol: '₹',
          },
        },
      },
    };
    renderCheckout([
      financeMock(),
      meMock(),
      podMock(),
      couponsMock(POD_ID),
      previewMock,
    ]);
    await screen.findByText('Confirm your spot');
    const input = screen.getByLabelText('Coupon code');
    fireEvent.change(input, { target: { value: 'save10' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    expect(await screen.findByText('SAVE10 applied')).toBeInTheDocument();
  });

  it('completes a dummy-gateway payment and shows the success screen', async () => {
    const checkoutMock: MockedResponse = {
      request: { query: DUMMY_CHECKOUT },
      variableMatcher: () => true,
      result: {
        data: {
          dummyCheckout: {
            id: 'pay1',
            payment_id: 'PAY-123',
            invoice_no: 'INV-1',
            total: 1000,
            currency_symbol: '₹',
            status: 'SUCCESS',
            paid_at: '2026-08-01T10:05:00.000Z',
            created_at: '2026-08-01T10:05:00.000Z',
          },
        },
      },
    };
    renderCheckout([
      financeMock(),
      meMock(),
      podMock(),
      couponsMock(POD_ID),
      checkoutMock,
    ]);
    await screen.findByText('Confirm your spot');
    // Prefill from `me` makes the form valid; wait for the Pay button to be enabled.
    const payButton = await screen.findByRole('button', { name: /^pay/i });
    await waitFor(() => expect(payButton).not.toBeDisabled());
    fireEvent.click(payButton);
    expect(await screen.findByText('Payment Successful')).toBeInTheDocument();
  });
});
