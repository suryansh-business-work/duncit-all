import '../../../../../__tests__/helpers/agGridEnv';
import '../../../../__tests__/groupC-wide-grid';
import { fireEvent, screen } from '@testing-library/react';
import ReturnsPage from '../ReturnsPage';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../../__tests__/groupC-link';

type Over = Record<string, unknown>;

/** One buyer return with every field the returns documents select. */
export const returnRow = (over: Over = {}) => ({
  __typename: 'PodShopReturn',
  id: 'r1',
  return_no: 'RET-1',
  order_no: 'ORD-1001',
  buyer_name: 'Meera Iyer',
  items: [
    { __typename: 'PodShopReturnItem', product_id: 'p1', variant_id: 'v1', name: 'Pet Collar', variant_label: 'Large', qty: 2, unit_cost: 250, image_url: '' },
    { __typename: 'PodShopReturnItem', product_id: 'p2', variant_id: 'v2', name: 'Leash', variant_label: '', qty: 1, unit_cost: 100, image_url: '' },
  ],
  reason: 'Wrong size',
  comments: 'Too tight on my dog',
  status: 'REQUESTED',
  gross: 600,
  decision_note: '',
  events: [{ __typename: 'PodShopReturnEvent', status: 'REQUESTED', note: 'Buyer asked', by: 'Meera', at: '2026-07-01T10:00:00.000Z' }],
  pickup: { __typename: 'PodShopReturnPickup', awb: '', courier_name: '', status: 'NONE', tracking_status: '', last_error: '' },
  refund: { __typename: 'OrderRefund', status: 'NONE', amount: 0, coins: 0, error: '' },
  created_at: '2026-07-01T10:00:00.000Z',
  ...over,
});

export const returnsPage = (rows: unknown[]) => ({
  podShopReturnsTable: { __typename: 'PodShopReturnTablePage', total: rows.length, rows },
});

export function mountReturns(rows: unknown[], answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) {
  return renderWithProviders(<ReturnsPage />, {
    route: '/ecomm-brand/returns',
    link: scriptedLink({ PartnerPodShopReturnsTable: returnsPage(rows), ...answers }, sent),
  });
}

/** Clicks the row with this return number and resolves with the opened drawer's content. */
export async function openReturn(returnNo: string) {
  fireEvent.click(await screen.findByText(returnNo));
  return screen.findByTestId('return-detail');
}
