import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Autocomplete, Button, Stack, TextField } from '@mui/material';
import { CATEGORIES, type CategoryLevel, type CategoryOption } from './queries';

export interface CategoryScope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

interface Props {
  submitting: boolean;
  onContinue: (scope: CategoryScope) => void;
}

const useLevel = (level: CategoryLevel, parentId: string) => {
  const skip = level !== 'SUPER' && !parentId;
  const { data, loading } = useQuery<{ categories: CategoryOption[] }>(CATEGORIES, {
    variables: { level, parent_id: level === 'SUPER' ? null : parentId },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  const options = (data?.categories ?? [])
    .filter((c) => c.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  return { options, loading };
};

/** Super → Category → Sub picker shown before the survey; resolves which survey to ask. */
export default function CategoryStep({ submitting, onContinue }: Readonly<Props>) {
  const [scope, setScope] = useState<CategoryScope>({ super_category_id: '', category_id: '', sub_category_id: '' });
  const supers = useLevel('SUPER', '');
  const cats = useLevel('CATEGORY', scope.super_category_id);
  const subs = useLevel('SUB', scope.category_id);

  const pick = (level: keyof CategoryScope, id: string) => {
    if (level === 'super_category_id') setScope({ super_category_id: id, category_id: '', sub_category_id: '' });
    else if (level === 'category_id') setScope((s) => ({ ...s, category_id: id, sub_category_id: '' }));
    else setScope((s) => ({ ...s, sub_category_id: id }));
  };

  const field = (
    label: string,
    level: keyof CategoryScope,
    list: CategoryOption[],
    loading: boolean,
    disabled: boolean,
  ) => (
    <Autocomplete
      options={list.map((c) => c.id)}
      value={scope[level] || null}
      getOptionLabel={(id) => list.find((c) => c.id === id)?.name ?? ''}
      onChange={(_, v) => pick(level, v ?? '')}
      loading={loading}
      disabled={disabled}
      renderInput={(p) => <TextField {...p} label={label} size="small" />}
    />
  );

  return (
    <Stack spacing={2}>
      {field('Super category *', 'super_category_id', supers.options, supers.loading, false)}
      {field('Category', 'category_id', cats.options, cats.loading, !scope.super_category_id)}
      {field('Sub category', 'sub_category_id', subs.options, subs.loading, !scope.category_id)}
      <Button
        variant="contained"
        size="large"
        disabled={submitting || !scope.super_category_id}
        onClick={() => onContinue(scope)}
        sx={{ borderRadius: 999, fontWeight: 900 }}
      >
        {submitting ? 'Loading…' : 'Continue'}
      </Button>
    </Stack>
  );
}
