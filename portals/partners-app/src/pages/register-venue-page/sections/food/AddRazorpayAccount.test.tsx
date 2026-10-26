import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { partnersFoodAccount } from './AddRazorpayAccount';
import { connection } from '../../../ecomm-brand-page/integrations/__tests__/harness';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink } from '../../../../__tests__/groupC-link';

afterEach(cleanup);

const field = (testId: string) => screen.getByTestId(testId).querySelector('input') as HTMLInputElement;

const mount = (saved: unknown) => {
  const select = vi.fn();
  const account = partnersFoodAccount('venue');
  if (account.kind !== 'picker') throw new Error('the console picks a saved account');
  renderWithProviders(<>{account.addAccount?.(select)}</>, {
    link: scriptedLink({
      SavePartnerIntegration: { savePartnerIntegration: saved },
      MyPartnerIntegrations: { myPartnerIntegrations: [saved] },
    }),
  });
  return select;
};

const addAndSave = async () => {
  fireEvent.click(screen.getByTestId('venue-food-add-razorpay'));
  await screen.findByTestId('connection-form-razorpay');
  fireEvent.change(field('connection-razorpay-label'), { target: { value: 'Venue Razorpay' } });
  fireEvent.change(field('integration-razorpay-key_id'), { target: { value: 'rzp_test_main' } });
  fireEvent.change(field('integration-razorpay-key_secret'), { target: { value: 'secret-value' } });
  fireEvent.click(screen.getByTestId('connection-razorpay-save'));
};

describe('partnersFoodAccount', () => {
  it('picks the account it just saved once the vendor check passed, and closes the dialog', async () => {
    const select = mount(connection('c9', 'RAZORPAY', 'Venue Razorpay'));
    await addAndSave();
    await waitFor(() => expect(select).toHaveBeenCalledWith('c9'));
    await waitFor(() => expect(screen.queryByTestId('connection-form-razorpay')).toBeNull());
  });

  it('leaves an account that failed its check unpicked', async () => {
    const select = mount(connection('c9', 'RAZORPAY', 'Venue Razorpay', { connected: false, message: 'Bad key' }));
    await addAndSave();
    await waitFor(() => expect(screen.queryByTestId('connection-form-razorpay')).toBeNull());
    expect(select).not.toHaveBeenCalled();
  });
});
