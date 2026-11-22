import { Step, StepLabel, Stepper } from '@mui/material';
import { giftCardOrderSteps, type GiftCardOrderStatusFacts } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/** Placed → paid → emailed, or printed → shipped → out for delivery → delivered (shared with native). */
export default function OrderProgress({ order }: Readonly<{ order: GiftCardOrderStatusFacts }>) {
  const { t } = useTranslation();
  const steps = giftCardOrderSteps(order);
  const active = steps.filter((s) => s.done).length;
  return (
    <Stepper data-testid="gift-card-order-progress" activeStep={active} alternativeLabel>
      {steps.map((step) => (
        <Step key={step.id} completed={step.done}>
          <StepLabel>{t(step.labelKey)}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
