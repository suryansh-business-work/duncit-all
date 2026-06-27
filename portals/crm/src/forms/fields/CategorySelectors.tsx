import { useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useQuery } from '@apollo/client';
import { Autocomplete, Skeleton, Stack, TextField } from '@mui/material';
import { CATEGORIES_BY_PARENT, CATEGORIES_BY_LEVEL, type CategoryOption } from '../../api/data.gql';

interface Props {
  superName?: string;
  categoryName?: string;
  subName?: string;
}

/**
 * Nested Category (multi) + Sub-category (multi) pickers under the chosen Super
 * Category. Categories are scoped to the super; sub-categories to the selected
 * categories. Bound to RHF `category_ids` / `sub_category_ids`. Selecting a
 * narrower level clears stale deeper picks so the hierarchy stays consistent.
 */
export default function CategorySelectors({
  superName = 'super_category_id',
  categoryName = 'category_ids',
  subName = 'sub_category_ids',
}: Readonly<Props>) {
  const { control, setValue } = useFormContext();
  const superId = (useWatch({ control, name: superName }) as string) || '';
  const categoryIds = (useWatch({ control, name: categoryName }) as string[]) ?? [];
  const subIds = (useWatch({ control, name: subName }) as string[]) ?? [];

  const cats = useQuery<{ categories: CategoryOption[] }>(CATEGORIES_BY_PARENT, {
    variables: { level: 'CATEGORY', parent_id: superId || null },
    skip: !superId,
    fetchPolicy: 'cache-and-network',
  });
  // All sub-categories (no parent filter — passing parent_id: null matches none),
  // then narrowed client-side to the selected categories.
  const subs = useQuery<{ categories: CategoryOption[] }>(CATEGORIES_BY_LEVEL, {
    variables: { level: 'SUB' },
    skip: categoryIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });

  const catOptions = (cats.data?.categories ?? []).filter((c) => c.is_active !== false);
  const subOptions = useMemo(
    () => (subs.data?.categories ?? []).filter((s) => s.is_active !== false && s.parent_id && categoryIds.includes(s.parent_id)),
    [subs.data, categoryIds]
  );
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    [...catOptions, ...subOptions].forEach((c) => m.set(c.id, c.name));
    return m;
  }, [catOptions, subOptions]);

  // Drop categories not under the current super, and subs not under a selected category.
  useEffect(() => {
    if (!superId && categoryIds.length) setValue(categoryName, [], { shouldDirty: true });
  }, [superId, categoryIds.length, categoryName, setValue]);
  useEffect(() => {
    // Don't prune while the sub options are still loading — otherwise editing a
    // lead wipes its saved sub-categories before the options arrive (the saved
    // subs then never persist on the next save).
    if (subs.loading || (categoryIds.length > 0 && (subs.data?.categories ?? undefined) === undefined)) return;
    const valid = subIds.filter((id) => subOptions.some((s) => s.id === id));
    if (valid.length !== subIds.length) setValue(subName, valid, { shouldDirty: true });
  }, [subOptions, subIds, subName, setValue, subs.loading, subs.data, categoryIds.length]);

  if (!superId) return null;

  const renderCatInput = (p: object) => (
    <TextField {...p} label="Category" placeholder={categoryIds.length ? '' : 'Select categories'} helperText="Optional · multiple" />
  );
  const renderSubInput = (p: object) => (
    <TextField {...p} label="Sub Category" placeholder={subIds.length ? '' : 'Select sub-categories'} helperText="Optional · multiple" />
  );

  return (
    <Stack spacing={1.5}>
      {cats.loading && catOptions.length === 0 ? (
        <Skeleton variant="rounded" height={40} />
      ) : (
        <Autocomplete
          multiple
          size="small"
          options={catOptions.map((c) => c.id)}
          value={categoryIds.filter((id) => catOptions.some((c) => c.id === id))}
          getOptionLabel={(id) => nameById.get(id) ?? id}
          onChange={(_, v) => setValue(categoryName, v, { shouldDirty: true })}
          renderInput={renderCatInput}
        />
      )}
      {categoryIds.length > 0 && (
        <Autocomplete
          multiple
          size="small"
          options={subOptions.map((s) => s.id)}
          value={subIds.filter((id) => subOptions.some((s) => s.id === id))}
          getOptionLabel={(id) => nameById.get(id) ?? id}
          onChange={(_, v) => setValue(subName, v, { shouldDirty: true })}
          loading={subs.loading}
          renderInput={renderSubInput}
        />
      )}
    </Stack>
  );
}
