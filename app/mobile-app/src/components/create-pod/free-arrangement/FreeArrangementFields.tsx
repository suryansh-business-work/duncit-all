import { useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import {
  FREE_DETAILS_LIMITS,
  FREE_POLICY_KEYS,
  FREE_REASONS,
  FREE_REASON_KEY,
} from '@duncit/utils';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipSelectField } from '../ChipSelectField';
import { FreeAcceptCheckbox } from './FreeAcceptCheckbox';
import { FreePolicyDialog } from './FreePolicyDialog';

/** Where a form holds the justification (`freeJustificationFields`). */
export interface FreeArrangementNames<T extends FieldValues> {
  reason: Path<T>;
  details: Path<T>;
  accepted: Path<T>;
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  names: FreeArrangementNames<T>;
  /** Prefixes the test ids — Create Pod draws the fields on two steps. */
  testIDPrefix: string;
}

/**
 * What a host sees once they pick "Free" for the venue or the pod: Duncit's
 * free policy (with "More details"), why it is free — a special initiative, a
 * promotional offer, an approved campaign, or another reason they explain —
 * the warning on misuse, and their acceptance. Bound to any form by field name
 * (Create Pod, the resubmit sheet); the rules are `addFreeJustificationIssues`
 * (`@duncit/forms/schemas`). mWeb twin: @duncit/forms FreeArrangementFields.
 */
export function FreeArrangementFields<T extends FieldValues>({
  control,
  names,
  testIDPrefix,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reason = useController({ control, name: names.reason });
  const value: unknown = reason.field.value;
  const picked: string = typeof value === 'string' ? value : '';
  const options = FREE_REASONS.map((value) => ({ value, label: t(FREE_REASON_KEY[value]) }));

  return (
    <YStack gap={12} testID={`${testIDPrefix}-free-arrangement`}>
      <YStack gap={6}>
        <YStack role="status" aria-live="polite">
          <NoticeCard
            tone="note"
            title={t(FREE_POLICY_KEYS.title)}
            body={FREE_POLICY_KEYS.paragraphs.map((key) => t(key)).join('\n\n')}
            testID={`${testIDPrefix}-free-policy`}
          />
        </YStack>
        <XStack>
          <DuncitButton
            testID={`${testIDPrefix}-free-more-details`}
            label={t(FREE_POLICY_KEYS.moreDetails)}
            onPress={() => setDetailsOpen(true)}
            variant="ghost"
            size="sm"
            icon={<MaterialIcons name="info-outline" size={16} color={primary} />}
          />
        </XStack>
      </YStack>
      <ChipSelectField
        testID={`${testIDPrefix}-free-reason`}
        label={t(FREE_POLICY_KEYS.reasonLabel)}
        options={options}
        value={picked}
        onChange={reason.field.onChange}
        error={reason.fieldState.error?.message}
        required
      />
      {picked === 'OTHER' ? (
        <FormTextField
          control={control}
          name={names.details}
          label={t(FREE_POLICY_KEYS.detailsLabel)}
          hint={t(FREE_POLICY_KEYS.detailsHelp, { vars: { max: FREE_DETAILS_LIMITS.max } })}
          multiline
          numberOfLines={3}
          maxLength={FREE_DETAILS_LIMITS.max}
          required
        />
      ) : null}
      <NoticeCard
        tone="warning"
        title={t(FREE_POLICY_KEYS.warning)}
        testID={`${testIDPrefix}-free-warning`}
      />
      <FreeAcceptCheckbox
        control={control}
        name={names.accepted}
        testID={`${testIDPrefix}-free-accept`}
      />
      <FreePolicyDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        testID={`${testIDPrefix}-free-policy-dialog`}
      />
    </YStack>
  );
}
