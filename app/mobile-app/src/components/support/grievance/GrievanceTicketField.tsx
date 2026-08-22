import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { grievanceTicketFieldCopy } from '@duncit/i18n';
import type { GrievanceSupportTicketOption } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { GrievanceTicketEmpty } from './GrievanceTicketEmpty';
import { GrievanceTicketOptions } from './GrievanceTicketOptions';
import type { GrievanceValues } from './grievance.types';

interface Props {
  control: Control<GrievanceValues>;
  /** The user's own support history, newest first. */
  options: GrievanceSupportTicketOption[];
  loading?: boolean;
}

/**
 * Pick the support ticket this grievance escalates — the RN twin of mWeb's
 * `SupportTicketField`, built on the same expand-in-place pattern as the
 * support form's `CategorySelect`.
 *
 * A dropdown rather than a box to type in, because the app knows who is signed
 * in and can offer the person's real tickets — a typed reference is a reference
 * that can be wrong, and the officer would then be hunting for a ticket number
 * that never existed. The website, which has nobody signed in, is the one
 * surface that still asks for it as free text.
 */
export function GrievanceTicketField({ control, options, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { color: ink, muted } = useThemeColors();
  const copy = grievanceTicketFieldCopy(t);

  // Nothing to escalate: the field becomes the way forward instead.
  if (!loading && options.length === 0) return <GrievanceTicketEmpty />;

  return (
    <Controller
      name="support_ticket_ref"
      control={control}
      render={({ field, fieldState }) => {
        const chosen = options.find((option) => option.value === field.value);
        const borderColor = fieldState.error ? '$danger' : '$borderColor';
        const caption = fieldState.error?.message ?? copy.selectHint;
        const captionColor = fieldState.error ? '$danger' : '$muted';
        const pick = (value: string) => {
          field.onChange(value);
          field.onBlur();
          setOpen(false);
        };
        return (
          <YStack gap={4}>
            <Text fontSize={11.5} fontWeight="600" color="$muted">
              {copy.label}
            </Text>
            <XStack
              testID="grievance-support_ticket_ref"
              role="button"
              aria-label={copy.label}
              aria-expanded={open}
              onPress={() => setOpen((o) => !o)}
              alignItems="center"
              height={46}
              paddingHorizontal={12}
              borderRadius={12}
              borderWidth={1}
              borderColor={borderColor}
              backgroundColor="$background"
            >
              <MaterialIcons name="confirmation-number" size={18} color={muted} />
              <Text flex={1} marginLeft={8} fontSize={14} color={chosen ? '$color' : '$muted'}>
                {chosen?.label ?? copy.placeholder}
              </Text>
              <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={ink} />
            </XStack>
            {open ? (
              <GrievanceTicketOptions options={options} value={field.value} onPick={pick} />
            ) : null}
            <Text fontSize={11} color={captionColor} testID="grievance-support_ticket_ref-caption">
              {caption}
            </Text>
          </YStack>
        );
      }}
    />
  );
}
