import { Link as RouterLink } from 'react-router';
import { Paper, Stack, Step, StepButton, StepContent, Stepper, Typography } from '@mui/material';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';

import { useCart } from '../../app/providers/CartProvider';
import { EmptyState } from '../../components/EmptyState';
import { paths } from '../../lib/paths';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { AddressStep } from './address-step';
import { ContactStep } from './ContactStep';
import { PaymentStep } from './payment-step';
import { ReviewStep } from './ReviewStep';
import { useCheckoutQuote } from './useCheckoutQuote';
import { STEPS, useCheckoutState } from './useCheckoutState';

const STEP_KEYS: Record<(typeof STEPS)[number], string> = {
  contact: 'ecommStore.checkout.step.contact',
  address: 'ecommStore.checkout.step.address',
  payment: 'ecommStore.checkout.step.payment',
  review: 'ecommStore.checkout.step.review',
};

/** /checkout — contact, address, payment and review, one step at a time. */
export function CheckoutPage() {
  const { t } = useStoreT();
  const { cart, loading } = useCart();
  const controls = useCheckoutState();
  const quoteState = useCheckoutQuote(controls);
  usePageSeo(t('ecommStore.checkout.title'));
  if (loading && !cart) return <Loader label={t('ecommStore.common.loading')} />;
  if (!cart || cart.item_count === 0) {
    return (
      <EmptyState
        icon={<ShoppingBagOutlinedIcon />}
        title={t('ecommStore.cart.emptyTitle')}
        body={t('ecommStore.cart.emptyBody')}
        action={
          <DuncitButton component={RouterLink} to={paths.shop} variant="contained">
            {t('ecommStore.cart.startShopping')}
          </DuncitButton>
        }
      />
    );
  }
  const { step } = controls.state;
  const bodies = [
    <ContactStep key="contact" controls={controls} />,
    <AddressStep key="address" controls={controls} />,
    <PaymentStep key="payment" controls={controls} quoteState={quoteState} />,
    quoteState.quote ? <ReviewStep key="review" controls={controls} quote={quoteState.quote} /> : null,
  ];
  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h1">{t('ecommStore.checkout.title')}</Typography>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stepper activeStep={step} orientation="vertical" nonLinear>
          {STEPS.map((name, index) => (
            <Step key={name} completed={index < step}>
              <StepButton onClick={() => controls.goTo(index)} disabled={index >= step}>
                <Typography sx={{ fontWeight: 800 }}>{t(STEP_KEYS[name])}</Typography>
              </StepButton>
              <StepContent>{bodies[index]}</StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Stack>
  );
}
