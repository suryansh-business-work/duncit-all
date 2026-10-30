import { useMemo } from 'react';
import { useController } from 'react-hook-form';
import { Box } from '@mui/material';
import { SmartIncentiveField } from '@duncit/ui';
import { mwebSmartIncentiveLabels } from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import { useSmartIncentiveSettings } from '../../../../utils/smartIncentive';
import type { CreatePodForm } from '../create-pod.types';

/**
 * Step 4's Smart Incentive card: the shared `@duncit/ui` editor bound to the
 * stepper's form, shown only while Loyalty has the programme switched on.
 * Switching it on opens the explainer of what it is and who pays for it (the
 * editor does that itself). PricingStep hides the card for a FREE pod, and
 * PodTypeCards clears both values when the host switches to FREE.
 */
export default function SmartIncentiveStepField({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const settings = useSmartIncentiveSettings();
  const labels = useMemo(() => mwebSmartIncentiveLabels(t), [t]);
  const enabled = useController({ control: form.control, name: 'smart_incentive_enabled' });
  const pct = useController({ control: form.control, name: 'smart_incentive_pct' });
  const unitPrice = Number(form.watch('pod_amount')) || 0;
  if (!settings.enabled) return null;

  return (
    <Box data-testid="pricing-step-smart-incentive-card" sx={{ ...SURFACE_SX, p: 2 }}>
      <SmartIncentiveField
        enabled={enabled.field.value}
        pct={pct.field.value}
        onEnabledChange={enabled.field.onChange}
        onPctChange={pct.field.onChange}
        // A blur marks the field touched, so its message follows every edit from then on.
        onPctBlur={pct.field.onBlur}
        maxPct={settings.maxPct}
        delaySeconds={settings.delaySeconds}
        labels={labels}
        unitPrice={unitPrice > 0 ? unitPrice : undefined}
        formatPrice={format}
        error={pct.fieldState.error?.message}
      />
    </Box>
  );
}
