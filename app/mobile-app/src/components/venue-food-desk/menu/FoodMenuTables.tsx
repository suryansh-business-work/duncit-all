import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Input, Text, XStack, YStack } from 'tamagui';
import {
  foodTablesFromCount,
  publicPageTableStickersFileName,
  type FoodMenuFormValues,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FIELD_HEIGHT, FIELD_RADIUS, Field } from '@/components/Field';
import { FormTextField } from '@/components/FormTextField';
import {
  fetchTableStickersBase64,
  shareBase64File,
} from '@/components/public-page/publicPageRequests';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  control: Control<FoodMenuFormValues>;
  limit: number;
  venueId: string;
  venueName: string;
  /** The venue has tables saved — the stickers print the saved list. */
  hasSavedTables: boolean;
}

/**
 * A cafe's tables — typed as a list or filled in from a count — and their QR
 * stickers, saved through the OS share sheet. A guest who scans one has their
 * table filled in at checkout. Tamagui twin of @duncit/venue-food's FoodTablesFields.
 */
export function FoodMenuTables({
  control,
  limit,
  venueId,
  venueName,
  hasSavedTables,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [count, setCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countValue = Number(count);
  const canFill = Number.isInteger(countValue) && countValue > 0;

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const base64 = await fetchTableStickersBase64(
        venueId,
        t('venueFoodOwner.tables.stickerHeadline'),
        t('venueFoodOwner.tables.stickerTableWord'),
      );
      const saved = await shareBase64File(
        base64,
        publicPageTableStickersFileName(venueName),
        'application/pdf',
      );
      if (!saved) setError(t('venueFoodOwner.tables.downloadFailed'));
    } catch (err) {
      setError(toErrorMessage(err, t('venueFoodOwner.tables.downloadFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack gap={10} testID="food-menu-tables">
      <Text role="heading" fontSize={15} fontWeight="700" color="$color">
        {t('venueFoodOwner.tables.title')}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('venueFoodOwner.tables.intro')}
      </Text>
      <Controller
        control={control}
        name="food_tables"
        render={({ field }) => (
          <XStack gap={8} alignItems="flex-end">
            <YStack flex={1}>
              <Field label={t('venueFoodOwner.tables.count')} testID="food-menu-table-count">
                <Input
                  testID="food-menu-table-count"
                  aria-label={t('venueFoodOwner.tables.count')}
                  value={count}
                  onChangeText={setCount}
                  keyboardType="number-pad"
                  height={FIELD_HEIGHT}
                  borderRadius={FIELD_RADIUS}
                  borderColor="$borderColor"
                  backgroundColor="$surface"
                />
              </Field>
            </YStack>
            <DuncitButton
              testID="food-menu-table-fill"
              label={t('venueFoodOwner.tables.fill')}
              variant="outline"
              size="sm"
              disabled={!canFill}
              onPress={() => field.onChange(foodTablesFromCount(countValue, limit))}
            />
          </XStack>
        )}
      />
      <FormTextField
        control={control}
        name="food_tables"
        label={t('venueFoodOwner.tables.label')}
        hint={t('venueFoodOwner.tables.labelHint')}
        multiline
      />
      <DuncitButton
        testID="food-menu-table-stickers"
        label={t('venueFoodOwner.tables.download')}
        variant="outline"
        loading={busy}
        disabled={busy || !hasSavedTables}
        onPress={() => fireAndForget(download())}
      />
      <Text fontSize={12} color="$muted">
        {hasSavedTables ? t('venueFoodOwner.tables.downloadHint') : t('venueFoodOwner.tables.none')}
      </Text>
      {error ? (
        <Text role="alert" fontSize={12} color="$danger" testID="food-menu-table-stickers-error">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
