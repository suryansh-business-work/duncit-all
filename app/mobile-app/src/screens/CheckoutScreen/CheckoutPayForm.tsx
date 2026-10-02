import type { ParsedIssue } from '@duncit/errors';

import { CheckoutSavingsCard, OrderSummary } from '@/components/checkout';
import { IssueNotice } from '@/components/issue-notice/IssueNotice';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { formatMoney } from '@/utils/checkout-math';
import { CheckoutForm } from '@/forms/checkout';

import type { CheckoutActions } from './checkoutActions';
import type { CheckoutState } from './useCheckoutState';

/** Renders nothing until there is an issue — module scope so its branch stays
 * off the form's own complexity budget (S3776). */
function CheckoutIssue({ issue }: Readonly<{ issue: ParsedIssue | null }>) {
  if (!issue) return null;
  return <IssueNotice issue={issue} page="Checkout" />;
}

interface CheckoutPayFormProps {
  s: CheckoutState;
  actions: CheckoutActions;
  breakup: NonNullable<CheckoutState['breakup']>;
}

/** The unpaid checkout: order summary, savings, any server issue and the form. */
export function CheckoutPayForm({ s, actions, breakup }: Readonly<CheckoutPayFormProps>) {
  const { t, checkout, coins } = s;
  const { pod, me } = checkout;
  return (
    <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <OrderSummary
        pod={pod}
        breakup={s.payBreakup ?? breakup}
        grossTotal={breakup.total}
        discounts={s.discounts}
        seats={s.seats}
        unitAmount={Number(pod?.pod_amount) || 0}
        coins={s.coinSummary}
      />
      <CheckoutSavingsCard
        code={s.couponCode}
        setCode={s.setCouponCode}
        applied={s.coupon}
        error={s.couponError}
        applying={s.applyingCoupon}
        currency={breakup.currency}
        available={checkout.availableCoupons}
        onApply={actions.applyCoupon}
        onRemove={actions.removeCoupon}
        coins={coins}
        originalTotal={breakup.total}
      />
      <CheckoutIssue issue={s.serverIssue.issue} />
      <CheckoutForm
        initialValues={checkout.initialValues}
        mainAddress={me?.address ?? null}
        contact={s.contact}
        contactLoading={s.contactLoading}
        loading={s.submitting}
        errorMessage={s.error}
        dummyMode={s.dummyMode}
        // The number goes ON the button. On a multi-seat booking the summary
        // has usually scrolled away by the time the buyer reaches it, and the
        // last thing they read before paying should be what they will pay.
        payLabel={t('mweb.checkout.pay', {
          vars: { amount: formatMoney(breakup.currency, coins.effectiveTotal) },
        })}
        onSubmit={actions.submit}
      />
    </RefreshScrollView>
  );
}
