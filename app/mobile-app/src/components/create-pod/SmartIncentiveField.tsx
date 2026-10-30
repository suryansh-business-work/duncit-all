import { useState } from 'react';
import { Input, Text, YStack } from 'tamagui';
import { toDigits } from '@duncit/regex';
import { smartIncentiveFor, type SmartIncentiveFieldProps } from '@duncit/utils';

import { FIELD_HEIGHT, FIELD_RADIUS, Field } from '@/components/Field';
import { SectionHeader } from '@/components/SectionHeader';
import { ToggleRow } from '@/components/ToggleRow';
import { SmartIncentiveInfoDialog } from './SmartIncentiveInfoDialog';

// The props contract is shared with the MUI twin, so it lives in @duncit/utils.
export type { SmartIncentiveFieldProps } from '@duncit/utils';

/**
 * The line under the box — what one ticket then costs — or null while the
 * switch is off, there is no price to format, or the % is not yet a whole,
 * positive number.
 */
function previewLine(props: SmartIncentiveFieldProps): string | null {
  const { enabled, pct, unitPrice, formatPrice, labels } = props;
  if (!enabled || unitPrice === undefined || !formatPrice) return null;
  const offer = smartIncentiveFor(unitPrice, Number(pct));
  return offer.pct > 0 ? labels.pricePreview(formatPrice(offer.net)) : null;
}

/**
 * The host's Smart Incentive editor — the Tamagui twin of @duncit/ui
 * SmartIncentiveField (same props, same test ids, rule 27): a switch, the
 * discount % and what a ticket then costs. Switching it ON opens the
 * explainer, and "How it works" reopens it.
 *
 * Controlled and form-library free: the stepper and the host's Edit Pod sheet
 * own the values and run `smartIncentivePctIssue` in their Zod refine, then
 * hand the translated message back as `error`.
 */
export function SmartIncentiveField(props: SmartIncentiveFieldProps) {
  const { enabled, pct, labels, error, disabled = false } = props;
  const [infoOpen, setInfoOpen] = useState(false);
  const preview = previewLine(props);
  const switchTo = (next: boolean) => {
    props.onEnabledChange(next);
    // Never on without the host having read what it does and who pays for it.
    if (next) setInfoOpen(true);
  };

  return (
    <YStack testID="smart-incentive-field" gap={12}>
      <SectionHeader
        title={labels.title}
        actionLabel={labels.learnMore}
        onAction={() => setInfoOpen(true)}
        actionTestID="smart-incentive-learn-more"
        actionAriaLabel={labels.learnMore}
      />
      <ToggleRow
        testID="smart-incentive"
        label={labels.switchLabel}
        hint={labels.hint}
        value={enabled}
        onChange={switchTo}
        disabled={disabled}
      />
      {enabled ? (
        <YStack gap={6}>
          <Field
            label={labels.pctLabel}
            error={error}
            hint={labels.maxHint(props.maxPct)}
            testID="smart-incentive-pct"
            gap={6}
          >
            <Input
              testID="smart-incentive-pct"
              size="$4"
              minHeight={FIELD_HEIGHT}
              borderRadius={FIELD_RADIUS}
              paddingHorizontal={14}
              backgroundColor="$surface"
              color="$color"
              borderColor={error ? '$danger' : '$borderColor'}
              keyboardType="number-pad"
              value={pct}
              // `number-pad` is a request, not a rule: a paste or a hardware
              // keyboard still gets other characters past it.
              onChangeText={(text) => props.onPctChange(toDigits(text))}
              onBlur={props.onPctBlur}
              readOnly={disabled}
              aria-label={labels.pctLabel}
              aria-invalid={!!error}
            />
          </Field>
          {preview === null ? null : (
            <Text testID="smart-incentive-price-preview" fontSize={12} color="$muted">
              {preview}
            </Text>
          )}
        </YStack>
      ) : null}
      <SmartIncentiveInfoDialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        labels={labels.info}
        delaySeconds={props.delaySeconds}
      />
    </YStack>
  );
}
