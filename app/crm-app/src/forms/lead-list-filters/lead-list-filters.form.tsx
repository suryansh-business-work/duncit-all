import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { CRM_QUALIFICATION_KEY } from '@duncit/utils';
import { XStack, YStack } from 'tamagui';

import { ChoiceField, type ChoiceOption } from '@/components/ChoiceField';
import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import type { LeadListKind } from '@/features/leads-list/listKinds';
import { sortFieldsFor } from '@/features/leads-list/listQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { LeadListRangeFields } from './LeadListRangeFields';
import { makeLeadListFiltersSchema, type LeadListFilterValues } from './lead-list-filters.types';

/** The pickable values of a listing's enum filters (statuses, priorities, people, super categories). */
export interface LeadListFilterOptions {
  statuses: ChoiceOption[];
  priorities: ChoiceOption[];
  users: ChoiceOption[];
  superCategories: ChoiceOption[];
}

interface Props {
  kind: LeadListKind;
  nearby: boolean;
  options: LeadListFilterOptions;
  values: LeadListFilterValues;
  onApply: (values: LeadListFilterValues) => void;
  onClear: () => void;
}

/** Leads listing › Filters: the order and every filter the portal's lead table offers. */
export function LeadListFiltersForm({
  kind,
  nearby,
  options,
  values,
  onApply,
  onClear,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<LeadListFilterValues>(makeLeadListFiltersSchema(t)),
    [t],
  );
  const { control, handleSubmit } = useForm<LeadListFilterValues>({
    defaultValues: values,
    resolver,
    mode: 'onSubmit',
  });
  const choices = useMemo(
    () => ({
      sort: sortFieldsFor(kind, nearby).map((f) => ({ value: f.field, label: t(f.labelKey) })),
      dir: [
        { value: 'asc', label: t('crmApp.leadList.ascending') },
        { value: 'desc', label: t('crmApp.leadList.descending') },
      ],
      platforms: [
        { value: 'ANDROID', label: t('ui.platforms.android') },
        { value: 'IOS', label: t('ui.platforms.ios') },
        { value: 'WEB', label: t('ui.platforms.web') },
      ],
      qualifications: Object.entries(CRM_QUALIFICATION_KEY).map(([value, key]) => ({
        value,
        label: t(key),
      })),
      verifications: [
        { value: 'COMPLETE', label: t('crm.leadQuality.verificationComplete') },
        { value: 'IN_PROGRESS', label: t('crm.leadQuality.verificationInProgress') },
        { value: 'PENDING', label: t('crm.leadQuality.verificationPending') },
      ],
    }),
    [kind, nearby, t],
  );

  return (
    <YStack gap="$3">
      <ChoiceField
        control={control}
        name="sortField"
        label={t('crmApp.leadList.sortBy')}
        options={choices.sort}
        testID="filter-sort"
      />
      <ChoiceField
        control={control}
        name="sortDir"
        label={t('crmApp.leadList.order')}
        options={choices.dir}
        testID="filter-dir"
      />
      <ChoiceField
        control={control}
        name="statuses"
        label={t('shell.common.status')}
        options={options.statuses}
        multiple
        testID="filter-status"
      />
      <ChoiceField
        control={control}
        name="priorities"
        label={t('crm.common.priority')}
        options={options.priorities}
        multiple
        testID="filter-priority"
      />
      <ChoiceField
        control={control}
        name="assignees"
        label={t('crm.forms.assignedTo')}
        options={options.users}
        multiple
        searchLabel={t('crmApp.leadList.searchPeople')}
        testID="filter-assignee"
      />
      <ChoiceField
        control={control}
        name="superCategories"
        label={t('crm.common.superCategory')}
        options={options.superCategories}
        multiple
        searchLabel={t('crmApp.leadList.searchCategories')}
        testID="filter-super-category"
      />
      {kind.matchedUser ? (
        <ChoiceField
          control={control}
          name="platforms"
          label={t('crm.matchedUser.devices')}
          options={choices.platforms}
          multiple
          testID="filter-platform"
        />
      ) : null}
      <ChoiceField
        control={control}
        name="qualifications"
        label={t('crm.leadQualityTab.qualificationColumn')}
        options={choices.qualifications}
        multiple
        testID="filter-qualification"
      />
      <ChoiceField
        control={control}
        name="verifications"
        label={t('crm.leadQualityTab.verificationColumn')}
        options={choices.verifications}
        multiple
        testID="filter-verification"
      />
      <TextField control={control} name="city" label={t('crm.common.city')} testID="filter-city" />
      {kind.extraField && kind.copy.extraHeader ? (
        <TextField
          control={control}
          name="extra"
          label={t(kind.copy.extraHeader)}
          testID="filter-extra"
        />
      ) : null}
      <LeadListRangeFields control={control} nearby={nearby} />
      <XStack gap="$2" justifyContent="flex-end">
        <DuncitButton
          label={t('shell.table.clearAll')}
          onPress={onClear}
          variant="ghost"
          testID="filter-clear"
        />
        <DuncitButton
          label={t('shell.table.apply')}
          onPress={handleSubmit(onApply)}
          testID="filter-apply"
        />
      </XStack>
    </YStack>
  );
}
