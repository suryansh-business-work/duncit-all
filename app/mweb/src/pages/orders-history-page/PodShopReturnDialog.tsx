import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogTitle } from '@mui/material';
import { parseApiError, reasonKey, toReturnInput, type ReturnFormValues } from '@duncit/utils';
import PodShopReturnForm from '../../forms/pod-shop-return';
import { DIALOG_TITLE_SX } from '../../components/dialog-styles';
import { notify } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProductOrder } from '../pod-history-page/productOrders';
import { REQUEST_POD_SHOP_RETURN, type RequestPodShopReturnInput } from './podShopReturns.queries';

interface Props {
  /** The order being returned from; null keeps the dialog closed. */
  order: ProductOrder | null;
  onClose: () => void;
  /** The return landed — the page reloads orders and returns. */
  onRequested: () => void;
}

/** Ask to return items of a delivered pod-shop order. Native twin:
 * components/orders-history/PodShopReturnSheet (rule 27). */
export default function PodShopReturnDialog({ order, onClose, onRequested }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [request, { loading }] = useMutation<unknown, { input: RequestPodShopReturnInput }>(REQUEST_POD_SHOP_RETURN);

  const close = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const submit = async (values: ReturnFormValues) => {
    if (!order) return;
    setError(null);
    const key = reasonKey(values.reason);
    try {
      await request({ variables: { input: toReturnInput(order.id, values, key ? t(key) : values.reason) } });
      notify(t('mweb.podShopReturns.requested'), 'success');
      onRequested();
      onClose();
    } catch (e) {
      setError(parseApiError(e, t('mweb.podShopReturns.submitFailed')));
    }
  };

  return (
    <Dialog
      open={!!order}
      onClose={close}
      fullWidth
      maxWidth="xs"
      aria-labelledby="pod-shop-return-title"
      data-testid="pod-shop-return-dialog"
    >
      <DialogTitle id="pod-shop-return-title" sx={DIALOG_TITLE_SX}>
        {t('mweb.podShopReturns.returnItems')}
      </DialogTitle>
      {order && (
        <PodShopReturnForm
          key={order.id}
          order={order}
          busy={loading}
          errorMessage={error}
          onCancel={close}
          onSubmit={submit}
        />
      )}
    </Dialog>
  );
}
