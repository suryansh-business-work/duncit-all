import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { useCancelPodShopReturn } from '@/hooks/useCancelPodShopReturn';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The withdrawal in hand, from `useCancelPodShopReturn`. Open while it has a target. */
  cancel: Pick<
    ReturnType<typeof useCancelPodShopReturn>,
    'target' | 'busy' | 'confirm' | 'dismiss'
  >;
}

/**
 * "Cancel this return?" — the confirm step before a buyer withdraws a Pod Shop
 * return. One dialog for My Product Orders and the order's own screen, so both
 * ask the same question. RN twin of mWeb's CancelReturnDialog.
 */
export function PodShopReturnWithdrawDialog({ cancel }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={!!cancel.target}
      title={t('mweb.podShopReturns.cancelConfirmTitle')}
      message={t('mweb.podShopReturns.cancelConfirmMessage', {
        vars: { returnNo: cancel.target?.return_no ?? '' },
      })}
      confirmLabel={t('mweb.podShopReturns.cancelReturn')}
      cancelLabel={t('mweb.podShopReturns.keepReturn')}
      destructive
      busy={cancel.busy}
      onConfirm={cancel.confirm}
      onCancel={cancel.dismiss}
      testID="pod-shop-return-withdraw-dialog"
    />
  );
}
