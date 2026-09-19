import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { runAction } from '../../../lib/actions';
import type { ProductStatus } from '../../../lib/status';
import { SAVE_PRODUCT, type StoreProduct } from '../queries';
import type { ProductInput } from './product-form';

/** What a save announces, per the status it saved as. */
const SAVED_KEYS: Record<ProductStatus, string> = {
  DRAFT: 'ecommPortal.productEditor.savedDraft',
  PUBLISHED: 'ecommPortal.productEditor.savedPublished',
  ARCHIVED: 'ecommPortal.productEditor.savedArchived',
};

/**
 * Create (no id yet) or update the product as a status. The server's reason
 * — the publish checklist, a SKU already taken — is shown when it refuses. A
 * product just created moves the page to its own address.
 */
export function useSaveProduct(id: string | null) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mutate] = useMutation(SAVE_PRODUCT);

  return async (input: ProductInput, status: ProductStatus): Promise<StoreProduct | null> => {
    const outcome: { product: StoreProduct | null } = { product: null };
    const ok = await runAction(async () => {
      const result = await mutate({ variables: { id, input, status } });
      outcome.product = result.data?.storeSaveProduct ?? null;
    }, t(SAVED_KEYS[status]));
    const saved = ok ? outcome.product : null;
    if (saved && !id) navigate(`/products/${saved.id}`, { replace: true });
    return saved;
  };
}
