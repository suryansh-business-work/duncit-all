import { useFieldArray, useFormState, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { emptyRentalCategory, type RentalItemsValues } from '@duncit/utils';

import { CategoryCascadeField } from '@/components/pod-ideas/CategoryCascadeField';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  control: Control<RentalItemsValues>;
  index: number;
  /** The server's cap (`venueRegistrationConfig.rental_category_limit`). */
  max: number;
}

/**
 * The pods an item is offered on: one or more chained Super → Category → Sub
 * rows. A pod shows the item only when its club's category is one of them.
 * RN twin of @duncit/venue-rentals' RentalItemCategories.
 */
export function RentalItemCategoryRows({ control, index, max }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = `items.${index}.categories` as const;
  // Every pick goes through `update`, so each field already holds its row's live value.
  const { fields, append, remove, update } = useFieldArray({ control, name });
  const { errors } = useFormState({ control, name });
  // The list-level refusals ("at least one", "the same sub twice"). The resolver
  // files them under `root` only when row fields are mounted; these rows are
  // field-array values with no mounted inputs, so they land on the array itself.
  const listErrors = errors.items?.[index]?.categories;
  const listError = listErrors?.root?.message ?? listErrors?.message;
  const rowError = (row: number) => errors.items?.[index]?.categories?.[row]?.sub_id?.message;

  return (
    <YStack gap={10} testID={`rental-item-${index}-categories`}>
      <YStack gap={2}>
        <Text fontSize={13.5} fontWeight="700" color="$color">
          {t('venueRentals.items.categories')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('venueRentals.items.categoriesHint')}
        </Text>
      </YStack>
      {fields.map((field, row) => {
        return (
          <YStack
            key={field.id}
            gap={6}
            role="group"
            aria-label={t('venueRentals.items.categoryRow', { vars: { n: row + 1 } })}
          >
            <CategoryCascadeField
              idPrefix={`rental-item-${index}-category-${row}`}
              value={{
                super_category_id: field.super_id,
                category_id: field.category_id,
                sub_category_id: field.sub_id,
              }}
              onChange={(scope, labels) =>
                update(row, {
                  super_id: scope.super_category_id,
                  super_name: labels.super_category_name,
                  category_id: scope.category_id,
                  category_name: labels.category_name,
                  sub_id: scope.sub_category_id,
                  sub_name: labels.sub_category_name,
                })
              }
            />
            {rowError(row) ? (
              <Text role="alert" fontSize={12} color="$danger">
                {rowError(row)}
              </Text>
            ) : null}
            {fields.length > 1 ? (
              <XStack>
                <DuncitButton
                  testID={`rental-item-${index}-category-${row}-remove`}
                  label={t('venueRentals.items.removeCategory', { vars: { n: row + 1 } })}
                  variant="ghost"
                  tone="danger"
                  size="sm"
                  onPress={() => remove(row)}
                />
              </XStack>
            ) : null}
          </YStack>
        );
      })}
      {listError ? (
        <Text
          role="alert"
          fontSize={12}
          color="$danger"
          testID={`rental-item-${index}-categories-error`}
        >
          {listError}
        </Text>
      ) : null}
      <XStack>
        <DuncitButton
          testID={`rental-item-${index}-category-add`}
          label={t('venueRentals.items.addCategory')}
          variant="ghost"
          size="sm"
          disabled={fields.length >= max}
          onPress={() => append(emptyRentalCategory())}
        />
      </XStack>
      {fields.length >= max ? (
        <Text fontSize={12} color="$muted">
          {t('venueRentals.items.categoryMaxReached')}
        </Text>
      ) : null}
    </YStack>
  );
}
