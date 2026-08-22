import { POD_PRODUCT_FALLBACK_FLAT, formatMoney } from '@duncit/pod-product-picker';
import { defineDemo, defineDemos } from '../types';

interface PickerMock {
  /** What the host has asked the venue to provide. */
  requests: { product_id: string; name: string; unit_cost: number; quantity: number }[];
}

export default defineDemos('pod-product-picker', [
  defineDemo<PickerMock>({
    id: 'requests',
    title: 'What the host is asking the venue to lay on',
    note:
      'Raise a quantity and the total follows. These lines are what the venue is paid for on top of the slot, so the arithmetic is the same one Finance settles on.',
    mock: {
      requests: [
        { product_id: 'prod-1', name: 'Shuttlecocks (tube of 6)', unit_cost: 450, quantity: 2 },
        { product_id: 'prod-2', name: 'Racket hire', unit_cost: 120, quantity: 4 },
        { product_id: 'prod-3', name: 'Bottled water', unit_cost: 20, quantity: 8 },
      ],
    },
    compute: (mock) => {
      const lines = mock.requests.map((request) => ({
        line: request.name,
        cost: formatMoney(request.unit_cost * request.quantity),
      }));
      const total = mock.requests.reduce(
        (sum, request) => sum + request.unit_cost * request.quantity,
        0
      );
      return {
        Lines: lines,
        Total: formatMoney(total),
        'Copy this picker ships': POD_PRODUCT_FALLBACK_FLAT,
      };
    },
  }),
]);
