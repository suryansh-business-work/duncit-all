import { Text, XStack, YStack } from 'tamagui';
import { effectiveMaxAdvance, recurringErrorMessage } from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { AdvancedSections } from '../advanced/AdvancedSections';
import { PreviewSummaryCard } from './PreviewSummaryCard';
import { RecurringBasicSection } from './RecurringBasicSection';
import { useRecurringSheet } from './useRecurringSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  venueId: string;
  /** The venue's GraphQL `settings`, read leniently — old venues carry none. */
  settings: unknown;
  capacityItems: readonly { label: string; capacity: number }[];
  venueCapacity: number;
  /** After the batch or a bulk edit: the calendar re-reads its month. */
  onSlotsChanged: () => void;
  /** After a rule or auto-extend save: the screen re-reads the venue. */
  onVenueChanged: () => void;
}

/**
 * The recurring-availability sheet — the Tamagui twin of the MUI
 * RecurringAvailabilityDialog (rule 27): a date range, the weekdays, one or
 * more daily windows (or whole days), a price per space, what to do on a
 * clash, the live preview and the four advanced sections. The preview and
 * the batch it sends come from the same generator call.
 */
export function RecurringSheet({
  open,
  onClose,
  venueId,
  settings,
  capacityItems,
  venueCapacity,
  onSlotsChanged,
  onVenueChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { form, patch, reset, venueSettings, result, submit, submitting, serverError } =
    useRecurringSheet(venueId, settings, capacityItems, venueCapacity, onSlotsChanged);

  const close = () => {
    reset();
    onClose();
  };
  const create = () => {
    submit()
      .then((ok) => {
        if (ok) close();
      })
      .catch(() => undefined);
  };

  const total = result.summary.total;
  const canCreate = result.errors.length === 0 && total > 0 && !submitting;
  const datesPicked = !!form.startDate && !!form.endDate;
  const firstError = result.errors[0];
  const advanceCap = effectiveMaxAdvance(venueSettings.rules.max_advance_days);
  let createLabel = t('availability.recurring.createSlots', { vars: { count: total } });
  if (total === 1) createLabel = t('availability.recurring.createSlot');
  if (submitting) createLabel = t('availability.recurring.creating');

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="recurring-cancel"
          label={t('availability.cancel')}
          onPress={close}
          variant="ghost"
          tone="neutral"
          fullWidth
          disabled={submitting}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="recurring-create"
          label={createLabel}
          onPress={create}
          fullWidth
          disabled={!canCreate}
          loading={submitting}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={close}
      testID="recurring-sheet"
      title={t('availability.recurring.title')}
      subtitle={t('availability.recurring.subtitle')}
      closeLabel={t('availability.close')}
      dismissOnBackdrop={!submitting}
      footer={footer}
    >
      <YStack gap={14}>
        <RecurringBasicSection form={form} patch={patch} settings={venueSettings} />
        {serverError ? (
          <Text testID="recurring-server-error" fontSize={12.5} color="$danger">
            {serverError}
          </Text>
        ) : null}
        {datesPicked && firstError ? (
          <Text testID="recurring-issue" fontSize={12.5} color="$warning">
            {recurringErrorMessage(firstError, t, venueSettings)}
          </Text>
        ) : null}
        <PreviewSummaryCard summary={result.summary} maxAdvanceDays={advanceCap} />
        <AdvancedSections
          venueId={venueId}
          settings={venueSettings}
          form={form}
          patch={patch}
          onVenueChanged={onVenueChanged}
          onSlotsChanged={onSlotsChanged}
        />
      </YStack>
    </DuncitDialog>
  );
}
