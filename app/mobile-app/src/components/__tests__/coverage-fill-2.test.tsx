import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { EditAccountDialog } from '@/components/account/EditAccountDialog';
import { CheckoutSuccess } from '@/components/checkout/CheckoutSuccess';
import { ConfirmationPodCard } from '@/components/checkout/ConfirmationPodCard';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { ProcessingOverlay } from '@/components/checkout/ProcessingOverlay';
import { Accordion } from '@/components/details/Accordion';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({ locations: [] }),
}));

describe('AuthScaffold accent word', () => {
  it('renders the accent-coloured trailing word', () => {
    renderWithProviders(
      <AuthScaffold testID="scaffold" title="Welcome" accentWord="back." subtitle="Sub">
        <></>
      </AuthScaffold>,
    );
    expect(screen.getByTestId('scaffold')).toBeOnTheScreen();
    expect(screen.getByText('back.')).toBeOnTheScreen();
  });
});

describe('EditAccountDialog non-Error save failure', () => {
  it('shows a generic message when onSave rejects with a non-Error', async () => {
    const onSave = jest.fn().mockRejectedValue('weird');
    renderWithProviders(
      <EditAccountDialog
        open
        me={{ first_name: 'Riya', roles: ['USER'] } as never}
        onClose={jest.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    await waitFor(
      () =>
        expect(screen.getByTestId('account-edit-submit').props.accessibilityState?.disabled).toBe(
          false,
        ),
      { timeout: 8000 },
    );
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    // Generous timeout: the RHF validate → submit → rejected onSave → setState →
    // re-render chain can exceed waitFor's 1s default under parallel CI load, so
    // this assertion flaked order-dependently once the suite grew.
    await screen.findByTestId('account-edit-error', {}, { timeout: 8000 });
    expect(screen.getByTestId('account-edit-error')).toHaveTextContent('Could not save profile.');
  }, 20000);
});

describe('CheckoutSuccess invoice fallback', () => {
  it('renders an em dash when there is no invoice number', () => {
    renderWithProviders(
      <CheckoutSuccess
        payment={
          { invoice_no: null, currency_symbol: '₹', total: 100, created_at: '2026-06-09' } as never
        }
        onDownloadInvoice={jest.fn().mockResolvedValue(undefined)}
        onHome={jest.fn()}
        onProfile={jest.fn()}
      />,
    );
    expect(screen.getByTestId('checkout-success')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
  });
});

describe('ConfirmationPodCard', () => {
  it('returns null without a pod', () => {
    renderWithProviders(<ConfirmationPodCard pod={null} />);
    expect(screen.queryByTestId('confirmation-pod')).toBeNull();
  });

  it('renders image, date and zone when present', () => {
    renderWithProviders(
      <ConfirmationPodCard
        pod={
          {
            pod_title: 'Pod',
            pod_images_and_videos: [{ url: 'https://i/x.jpg' }],
            pod_date_time: '2026-06-10T10:00:00Z',
            zone_name: 'Andheri',
          } as never
        }
      />,
    );
    expect(screen.getByTestId('confirmation-pod')).toBeOnTheScreen();
    expect(screen.getByText('Andheri')).toBeOnTheScreen();
  });
});

describe('OrderSummary fallbacks', () => {
  it('uses the default title and omits a missing zone', () => {
    renderWithProviders(
      <OrderSummary
        pod={
          {
            pod_title: undefined,
            pod_date_time: '2026-06-10T10:00:00Z',
            zone_name: undefined,
            pod_images_and_videos: [],
          } as never
        }
        breakup={{
          subtotal: 100,
          fee: 10,
          gst: 18,
          total: 128,
          currency: '₹',
          feePct: 10,
          gstPct: 18,
        }}
      />,
    );
    expect(screen.getByText('Pod booking')).toBeOnTheScreen();
  });
});

describe('ProcessingOverlay touch shield', () => {
  it('swallows presses on the backdrop', () => {
    renderWithProviders(<ProcessingOverlay open />);
    fireEvent.press(screen.getByTestId('checkout-processing'));
    expect(screen.getByTestId('checkout-processing')).toBeOnTheScreen();
  });
});

describe('Accordion', () => {
  it('renders without a testID (no header test id)', () => {
    renderWithProviders(
      <Accordion title="Details" icon="info" open onToggle={jest.fn()}>
        <></>
      </Accordion>,
    );
    expect(screen.getByText('Details')).toBeOnTheScreen();
  });
});
