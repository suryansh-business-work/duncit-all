import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { MutationDeleteMyProductListingArgs } from '@duncit/gql-types';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  DeletionRequestDialog,
  WithdrawDeletionDialog,
  useDeletionRequests,
  type DeletionTarget,
  type WithdrawTarget,
} from '../../ecomm-brand-page/deletion-request';
import { DELETE_LISTING, type ProductListingRow } from '../queries';
import { DeleteListingDialog } from './DeleteListingDialog';

interface Options {
  brandId: string;
  /** The direct delete's outcome line, shown above the table. */
  onMessage: (message: string | null) => void;
  refetch: () => void;
}

/**
 * Deleting a listing. A listing still in review goes straight away; a LIVE
 * (approved) one is a deletion request the Products team reviews, which hides
 * it from the shop and shows its state on the row until it completes or is withdrawn.
 */
export function useProductDeletion({ brandId, onMessage, refetch }: Options) {
  const { t } = useTranslation();
  const { openFor, reload } = useDeletionRequests(brandId);
  const [deleteListing, deleteState] = useMutation<{ deleteMyProductListing: boolean }, MutationDeleteMyProductListingArgs>(DELETE_LISTING);
  const [directTarget, setDirectTarget] = useState<ProductListingRow | null>(null);
  const [requestTarget, setRequestTarget] = useState<DeletionTarget | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<WithdrawTarget | null>(null);

  const startDelete = useCallback((product: ProductListingRow) => {
    if (product.listing_review_status === 'APPROVED') {
      setRequestTarget({ kind: 'PRODUCT', id: product.id, name: product.product_name });
    } else {
      setDirectTarget(product);
    }
  }, []);

  const startWithdraw = useCallback(
    (product: ProductListingRow) => {
      const request = openFor('PRODUCT', product.id);
      if (request) setWithdrawTarget({ request, name: product.product_name });
    },
    [openFor],
  );

  const changed = () => {
    reload();
    refetch();
  };

  const confirmDirectDelete = async () => {
    if (!directTarget) return;
    onMessage(null);
    try {
      await deleteListing({ variables: { product_doc_id: directTarget.id } });
      setDirectTarget(null);
      onMessage(t('partners.listProductsPage.productListingDeleted'));
      refetch();
    } catch (deleteError) {
      onMessage(parseApiError(deleteError));
    }
  };

  const dialogs = (
    <>
      <DeleteListingDialog
        target={directTarget}
        deleting={deleteState.loading}
        onCancel={() => setDirectTarget(null)}
        onConfirm={confirmDirectDelete}
      />
      <DeletionRequestDialog target={requestTarget} onClose={() => setRequestTarget(null)} onDone={changed} />
      <WithdrawDeletionDialog target={withdrawTarget} onClose={() => setWithdrawTarget(null)} onDone={changed} />
    </>
  );

  return { openFor, startDelete, startWithdraw, dialogs };
}
