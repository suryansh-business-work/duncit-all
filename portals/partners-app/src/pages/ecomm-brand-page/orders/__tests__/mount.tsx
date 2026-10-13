import { screen } from '@testing-library/react';
import OrderDetailPage from '../OrderDetailPage';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../../__tests__/groupC-link';

/** The order details page at /ecomm-brand/orders/o1, with the named operations answered. */
export function mountOrder(answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) {
  return renderWithProviders(<OrderDetailPage />, {
    route: '/ecomm-brand/orders/o1',
    path: '/ecomm-brand/orders/:orderId',
    link: scriptedLink(answers, sent),
  });
}

/** The answer to the single-order query. */
export const orderAnswer = (row: unknown) => ({ brandProductOrder: row });

/** Resolves once the order has loaded and the details are on screen. */
export async function openedOrder() {
  await screen.findByTestId('order-detail');
}
