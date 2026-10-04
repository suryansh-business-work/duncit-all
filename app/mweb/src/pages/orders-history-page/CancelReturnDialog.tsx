import { useMutation } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import ConfirmDialog from '../../components/ConfirmDialog';
import { notify } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { CANCEL_MY_POD_SHOP_RETURN, type PodShopReturn } from './podShopReturns.queries';

interface Props {
  /** The return being withdrawn; null keeps the dialog closed. */
  target: PodShopReturn | null;
  onClose: () => void;
  /** Withdrawn — the page reloads orders (the qty is returnable again) and returns. */
  onCancelled: () => void;
}

/** "Cancel this return?" — only offered while the return is still REQUESTED.
 * Native twin: the ConfirmDialog in OrdersHistoryScreen (rule 27). */
export default function CancelReturnDialog({ target, onClose, onCancelled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [cancel, { loading }] = useMutation<unknown, { id: string }>(CANCEL_MY_POD_SHOP_RETURN);

  const confirm = async () => {
    if (!target) return;
    try {
      await cancel({ variables: { id: target.id } });
      notify(t('mweb.podShopReturns.cancelled'), 'success');
      onCancelled();
      onClose();
    } catch (e) {
      notify(parseApiError(e, t('mweb.podShopReturns.cancelFailed')), 'error');
    }
  };

  return (
    <ConfirmDialog
      open={!!target}
      title={t('mweb.podShopReturns.cancelConfirmTitle')}
      message={t('mweb.podShopReturns.cancelConfirmMessage', { vars: { returnNo: target?.return_no ?? '' } })}
      confirmLabel={t('mweb.podShopReturns.cancelReturn')}
      cancelLabel={t('mweb.podShopReturns.keepReturn')}
      destructive
      busy={loading}
      onConfirm={() => {
        confirm().catch(() => undefined);
      }}
      onClose={onClose}
      testId="pod-shop-return-withdraw-dialog"
    />
  );
}
