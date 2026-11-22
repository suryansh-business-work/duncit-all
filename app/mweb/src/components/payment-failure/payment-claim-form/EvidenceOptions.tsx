import { Controller, type Control } from 'react-hook-form';
import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from '@mui/material';
import { PAYMENT_EVIDENCE_LABEL_KEYS, PAYMENT_EVIDENCE_TYPES } from '@duncit/forms/schemas';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PaymentClaimFormValues } from './payment-claim.types';

interface Props {
  control: Control<PaymentClaimFormValues>;
  /** Runs after the buyer picks a different option, so stale evidence is dropped. */
  onSwitch: () => void;
}

const LABEL_ID = 'payment-claim-options-label';

/** The three ways to show a deduction — screenshot, bank statement or transaction id. */
export default function EvidenceOptions({ control, onSwitch }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="evidence_type"
      render={({ field }) => (
        <FormControl>
          <FormLabel id={LABEL_ID} sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
            {t('mweb.payment.claim.optionsLabel')}
          </FormLabel>
          <RadioGroup
            aria-labelledby={LABEL_ID}
            name={field.name}
            value={field.value}
            onChange={(_event, value) => {
              const next = PAYMENT_EVIDENCE_TYPES.find((type) => type === value);
              if (!next || next === field.value) return;
              field.onChange(next);
              onSwitch();
            }}
          >
            {PAYMENT_EVIDENCE_TYPES.map((type) => (
              <FormControlLabel
                key={type}
                value={type}
                control={<Radio size="small" />}
                label={t(PAYMENT_EVIDENCE_LABEL_KEYS[type])}
                data-testid={`payment-claim-option-${type}`}
              />
            ))}
          </RadioGroup>
        </FormControl>
      )}
    />
  );
}
