import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Separator, YStack } from 'tamagui';
import { CRM_SERVICE_TARGETS, crmPickServiceTargets, type CrmServiceTargets } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { CategoryLevelField } from './CategoryLevelField';
import { ServiceFormActions } from './ServiceFormActions';
import { ServiceTargetSwitches } from './ServiceTargetSwitches';
import { ServiceTitlesField } from './ServiceTitlesField';
import {
  addServiceOfferedDefaults,
  makeAddServiceOfferedSchema,
  type AddServiceOfferedValues,
} from './service-offered.types';

interface Props {
  busy: boolean;
  onSubmit: (values: AddServiceOfferedValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Add Service Offered — the portal's dialog: cascading Super → Category → Sub
 * pickers (each scopes the next and a new pick clears the levels under it),
 * several titles at once, and the lead types. Add waits for a super category,
 * a title and a lead type.
 */
export function AddServiceOfferedForm({ busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<AddServiceOfferedValues>(makeAddServiceOfferedSchema(t)),
    [t],
  );
  const { control, handleSubmit, setValue, formState } = useForm({
    defaultValues: addServiceOfferedDefaults(),
    resolver,
    mode: 'onChange',
  });
  const values = useWatch({ control });
  const [superId, categoryId] = useWatch({ control, name: ['super_category_id', 'category_id'] });
  const setTargets = (next: CrmServiceTargets) => {
    for (const target of CRM_SERVICE_TARGETS) {
      setValue(target.flag, next[target.flag], { shouldValidate: true });
    }
  };

  return (
    <YStack gap="$4">
      <CategoryLevelField
        control={control}
        name="super_category_id"
        level="SUPER"
        parentId=""
        label={t('crm.common.superCategory')}
        hint={t('crm.data.topLevelCategory')}
        onPick={(option) => {
          if (option?.value !== superId) {
            setValue('category_id', '');
            setValue('sub_category_id', '');
          }
        }}
        testID="service-super"
      />
      <CategoryLevelField
        key={`category-${superId}`}
        control={control}
        name="category_id"
        level="CATEGORY"
        parentId={superId}
        label={t('crm.common.category')}
        hint={t('crm.common.optional')}
        emptyText={t('crm.data.noCategoriesUnderSuper')}
        onPick={(option) => {
          if (option?.value !== categoryId) setValue('sub_category_id', '');
        }}
        testID="service-category"
      />
      <CategoryLevelField
        key={`sub-${categoryId}`}
        control={control}
        name="sub_category_id"
        level="SUB"
        parentId={categoryId}
        label={t('crm.common.subCategory')}
        hint={t('crm.common.optional')}
        emptyText={t('crm.data.noSubCategoriesUnderCategory')}
        testID="service-sub"
      />
      <ServiceTitlesField control={control} />
      <Separator borderColor="$borderColor" />
      <ServiceTargetSwitches value={crmPickServiceTargets(values)} onChange={setTargets} />
      <ServiceFormActions
        submitLabel={busy ? t('crm.common.adding') : t('crm.common.add')}
        disabled={!formState.isValid}
        busy={busy}
        onSubmit={handleSubmit(onSubmit)}
        onCancel={onCancel}
        testID="service-add"
      />
    </YStack>
  );
}
