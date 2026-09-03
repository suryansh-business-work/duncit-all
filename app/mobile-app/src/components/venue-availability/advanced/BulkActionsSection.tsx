import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { ConfirmSheet } from '@/components/DuncitDialog';
import { LabeledInput } from '@/components/LabeledInput';
import {
  BulkDeleteVenueSlotsDocument,
  BulkUpdateVenueSlotsDocument,
} from '@/graphql/venue-availability';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { DateTimePickerField } from '../DateTimePickerField';
import { WeekdayChips } from '../recurring/WeekdayChips';
import { ExpandableSection } from './ExpandableSection';

// The price comes from a number box, which only ever yields '' or a number.
const toInt = (value: string) => Math.max(0, Math.round(Number(value)));

/** A confirmed-first action: the sentence it asks with, and what it then runs. */
type PendingAction = { text: string; run: () => Promise<void> };

interface Props {
  venueId: string;
  onDone: () => void;
}

/** Delete, disable, enable or re-price many upcoming slots at once. Booked
 * slots are never touched — the server skips them and says how many. */
export function BulkActionsSection({ venueId, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const filter = () => ({
    venue_id: venueId,
    from: from?.toISOString() ?? null,
    to: to?.toISOString() ?? null,
    weekdays: weekdays.length > 0 ? weekdays : null,
  });

  const runDelete = async () => {
    const data = await graphqlRequest(
      BulkDeleteVenueSlotsDocument,
      { input: filter() },
      { auth: true },
    );
    setResult(
      t('availability.bulk.deleted', { vars: { count: data.bulkDeleteVenueSlots.affected } }),
    );
    onDone();
  };

  const runUpdate = async (extra: { block?: boolean; set_price?: number }, action: string) => {
    const data = await graphqlRequest(
      BulkUpdateVenueSlotsDocument,
      { input: { ...filter(), ...extra } },
      { auth: true },
    );
    const { affected, skipped } = data.bulkUpdateVenueSlots;
    const vars = { action, count: affected, skipped };
    setResult(
      skipped
        ? t('availability.bulk.updatedSkipped', { vars })
        : t('availability.bulk.updated', { vars }),
    );
    onDone();
  };

  const confirmThen = (text: string, run: () => Promise<void>) => setPending({ text, run });
  const runConfirmed = () => {
    const action = pending;
    if (!action) return;
    setBusy(true);
    setError(null);
    action
      .run()
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t('availability.updateFailed')),
      )
      .finally(() => {
        setBusy(false);
        setPending(null);
      });
  };

  return (
    <ExpandableSection
      testID="advanced-bulk"
      icon="delete-forever"
      title={t('availability.bulk.title')}
      caption={t('availability.bulk.caption')}
      tone="error"
    >
      <Text fontSize={11.5} color="$muted">
        {t('availability.bulk.filterHint')}
      </Text>
      <DateTimePickerField
        testID="bulk-from"
        label={t('availability.bulk.from')}
        value={from}
        onChange={setFrom}
      />
      <DateTimePickerField
        testID="bulk-to"
        label={t('availability.bulk.to')}
        value={to}
        onChange={setTo}
      />
      <WeekdayChips testID="bulk-weekdays" value={weekdays} onChange={setWeekdays} />
      {result ? (
        <Text testID="bulk-result" fontSize={12.5} color="$primary">
          {result}
        </Text>
      ) : null}
      {error ? (
        <Text testID="bulk-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID="bulk-delete"
          label={t('availability.bulk.deleteMatching')}
          onPress={() => confirmThen(t('availability.bulk.confirmDelete'), runDelete)}
          variant="outline"
          tone="danger"
          size="sm"
        />
        <DuncitButton
          testID="bulk-disable"
          label={t('availability.bulk.disable')}
          onPress={() =>
            confirmThen(t('availability.bulk.confirmDisable'), () =>
              runUpdate({ block: true }, t('availability.bulk.actionDisabled')),
            )
          }
          variant="ghost"
          tone="danger"
          size="sm"
        />
        <DuncitButton
          testID="bulk-enable"
          label={t('availability.bulk.enable')}
          onPress={() =>
            confirmThen(t('availability.bulk.confirmEnable'), () =>
              runUpdate({ block: false }, t('availability.bulk.actionEnabled')),
            )
          }
          variant="ghost"
          tone="neutral"
          size="sm"
        />
      </XStack>
      <YStack gap={8}>
        <LabeledInput
          testID="bulk-price"
          label={t('availability.bulk.newPrice')}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <XStack>
          <DuncitButton
            testID="bulk-set-price"
            label={t('availability.bulk.setPrice')}
            onPress={() =>
              confirmThen(
                t('availability.bulk.confirmReprice', { vars: { price: toInt(price) } }),
                () => runUpdate({ set_price: toInt(price) }, t('availability.bulk.actionRepriced')),
              )
            }
            variant="outline"
            size="sm"
            disabled={price === ''}
          />
        </XStack>
      </YStack>
      <ConfirmSheet
        open={!!pending}
        busy={busy}
        testIDPrefix="bulk-action"
        title={t('availability.bulk.confirmTitle')}
        message={pending?.text ?? ''}
        cancelLabel={t('availability.cancel')}
        confirmLabel={t('availability.bulk.confirm')}
        busyLabel={t('availability.bulk.confirm')}
        onCancel={() => setPending(null)}
        onConfirm={runConfirmed}
      />
    </ExpandableSection>
  );
}
