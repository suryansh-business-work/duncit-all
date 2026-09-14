import type { HTMLAttributes, Key } from 'react';
import { Autocomplete, Box, Stack, TextField } from '@mui/material';
import { type CategoryOption } from '../survey-gate/queries';
import { useCategoryLevel } from '../survey-gate/useCategoryLevel';

export interface CategoryScope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}
export interface CategoryLabels {
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
}
export const EMPTY_CATEGORY_SCOPE: CategoryScope = {
  super_category_id: '',
  category_id: '',
  sub_category_id: '',
};

interface Props {
  value: CategoryScope;
  onChange: (scope: CategoryScope, labels: CategoryLabels) => void;
  /** Filter mode: drops the required markers (clearing a level means "All"). */
  allowAll?: boolean;
}

const nameOf = (list: CategoryOption[], id: string) => list.find((c) => c.id === id)?.name ?? '';

/** Each option carries its level's id and the category id: `category-cascade-super-option-<id>`. */
const optionWithTestId =
  (testId: string, list: CategoryOption[]) =>
  ({ key, ...props }: HTMLAttributes<HTMLLIElement> & { key?: Key }, id: string) => (
    <Box component="li" key={key} {...props} data-testid={`${testId}-option-${id}`}>
      {nameOf(list, id)}
    </Box>
  );

/**
 * Cascading Super → Category → Sub category picker shared by the pod-idea
 * composer (mandatory hierarchy) and the list filter (`allowAll`). Controlled:
 * emits the full id scope + resolved names on every change. Web twin of the
 * mobile CategoryCascadeField.
 */
export default function CategoryCascade({ value, onChange, allowAll }: Readonly<Props>) {
  const supers = useCategoryLevel('SUPER', '');
  const cats = useCategoryLevel('CATEGORY', value.super_category_id);
  const subs = useCategoryLevel('SUB', value.category_id);

  const emit = (scope: CategoryScope) =>
    onChange(scope, {
      super_category_name: nameOf(supers.options, scope.super_category_id),
      category_name: nameOf(cats.options, scope.category_id),
      sub_category_name: nameOf(subs.options, scope.sub_category_id),
    });

  const pick = (level: keyof CategoryScope, id: string) => {
    if (level === 'super_category_id')
      emit({ super_category_id: id, category_id: '', sub_category_id: '' });
    else if (level === 'category_id') emit({ ...value, category_id: id, sub_category_id: '' });
    else emit({ ...value, sub_category_id: id });
  };

  const field = (
    label: string,
    level: keyof CategoryScope,
    list: CategoryOption[],
    loading: boolean,
    disabled: boolean,
    testId: string,
  ) => (
    <Autocomplete
      options={list.map((c) => c.id)}
      value={value[level] || null}
      getOptionLabel={(id) => nameOf(list, id)}
      renderOption={optionWithTestId(testId, list)}
      onChange={(_, v) => pick(level, v ?? '')}
      loading={loading}
      disabled={disabled}
      renderInput={(p) => (
        <TextField {...p} label={label} size="small" data-testid={testId} />
      )}
    />
  );

  const mark = (base: string) => (allowAll ? base : `${base} *`);

  return (
    <Stack spacing={1.5} data-testid="category-cascade">
      {field(mark('Super Category'), 'super_category_id', supers.options, supers.loading, false, 'category-cascade-super')}
      {field(mark('Category'), 'category_id', cats.options, cats.loading, !value.super_category_id, 'category-cascade-category')}
      {field(mark('Sub Category'), 'sub_category_id', subs.options, subs.loading, !value.category_id, 'category-cascade-sub')}
    </Stack>
  );
}
