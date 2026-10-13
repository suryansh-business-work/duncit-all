import { vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import BrandDeleteButton from '../BrandDeleteButton';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

export const REQUESTS = 'PartnerMyCatalogDeletionRequests';
export const PREVIEW = 'PartnerCatalogDeletionPreview';
export const REQUEST = 'PartnerRequestCatalogDeletion';

export const request = (over: Record<string, unknown> = {}) => ({
  __typename: 'CatalogDeletionRequest',
  id: 'r1',
  kind: 'BRAND',
  brand_id: 'b1',
  product_id: null,
  parent_id: null,
  status: 'PENDING',
  scheduled_for: '2026-08-10',
  blocked_reason: '',
  ...over,
});

export const preview = (impact: Record<string, unknown> = {}) => ({
  catalogDeletionPreview: {
    __typename: 'CatalogDeletionPreview',
    kind: 'BRAND',
    brand_name: 'Chai Point',
    product_name: '',
    window: { __typename: 'CatalogDeletionWindow', earliest: '2026-08-01', latest: '2026-08-31' },
    impact: {
      __typename: 'CatalogDeletionImpact',
      open_orders: 3,
      open_returns: 1,
      orders: [
        {
          __typename: 'CatalogDeletionOrder',
          id: 'o1',
          order_no: 'ORD-77',
          fulfilment_status: 'SHIPPED',
          created_at: '2026-07-20T10:00:00.000Z',
          buyer_name: 'Meera Iyer',
          total: 500,
          currency_symbol: '₹',
          units: 2,
        },
      ],
      products: [
        { __typename: 'CatalogDeletionProduct', id: 'p1', product_name: 'Masala Chai', is_active: true },
        { __typename: 'CatalogDeletionProduct', id: 'p2', product_name: 'Ginger Chai', is_active: false },
      ],
      ...impact,
    },
  },
});

export interface Setup {
  status?: string;
  answers?: Record<string, ScriptedAnswer>;
  sent?: SentOperation[];
}

export const mount = ({ status = 'APPROVED', answers = {}, sent = [] }: Setup = {}) => {
  const onDeleted = vi.fn();
  const onRequested = vi.fn();
  renderWithProviders(
    <BrandDeleteButton
      brand={{ id: 'b1', brand_name: 'Chai Point', status } as never}
      label="Delete this brand"
      onDeleted={onDeleted}
      onRequested={onRequested}
    />,
    {
      link: scriptedLink(
        { [REQUESTS]: { myCatalogDeletionRequests: [] }, [PREVIEW]: preview(), ...answers },
        sent,
      ),
    },
  );
  return { onDeleted, onRequested };
};

export const openDialog = async () => {
  fireEvent.click(await screen.findByTestId('brand-danger-delete'));
  return within(await screen.findByRole('dialog'));
};
