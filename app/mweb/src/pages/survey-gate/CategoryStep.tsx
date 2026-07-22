import { useState } from 'react';
import { Alert, Autocomplete, Button, Stack, TextField } from '@mui/material';
import { type CategoryOption } from './queries';
import { useCategoryLevel } from './useCategoryLevel';

export interface CategoryScope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

/** Display names for the chosen Super/Category/Sub — shown in the summary banner. */
export interface CategoryLabels {
  super: string;
  category: string;
  sub: string;
}

const EMPTY_SCOPE: CategoryScope = { super_category_id: '', category_id: '', sub_category_id: '' };

interface Props {
  submitting: boolean;
  onContinue: (scope: CategoryScope, labels: CategoryLabels) => void;
  /** Leaf category ids the caller already holds/has pending — greyed out in the picker.
   * Omitted (default) → no option is disabled, so the shared survey-gate is unaffected. */
  disabledIds?: string[];
  /** Prior selection to seed the picker with when re-entered to edit. */
  initialScope?: CategoryScope;
}

/** Super → Category → Sub picker shown before the survey; resolves which survey to ask. */
export default function CategoryStep({
  submitting,
  onContinue,
  disabledIds,
  initialScope,
}: Readonly<Props>) {
  const [scope, setScope] = useState<CategoryScope>(initialScope ?? EMPTY_SCOPE);
  const disabledSet = new Set(disabledIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const supers = useCategoryLevel('SUPER', '');
  const cats = useCategoryLevel('CATEGORY', scope.super_category_id);
  const subs = useCategoryLevel('SUB', scope.category_id);

  const pick = (level: keyof CategoryScope, id: string) => {
    setError(null);
    if (level === 'super_category_id') setScope({ super_category_id: id, category_id: '', sub_category_id: '' });
    else if (level === 'category_id') setScope((s) => ({ ...s, category_id: id, sub_category_id: '' }));
    else setScope((s) => ({ ...s, sub_category_id: id }));
  };

  // A level is required only when it actually has options to choose from —
  // a leaf super/category has no children, so we don't dead-end the user.
  const firstMissing = (): string | null => {
    if (!scope.super_category_id) return 'Please select a Super Category.';
    if (cats.options.length > 0 && !scope.category_id) return 'Please select a Category.';
    if (subs.options.length > 0 && !scope.sub_category_id) return 'Please select a Sub-Category.';
    return null;
  };

  const nameOf = (list: CategoryOption[], id: string) => list.find((c) => c.id === id)?.name ?? '';

  const onSubmit = () => {
    const missing = firstMissing();
    if (missing) { setError(missing); return; }
    setError(null);
    onContinue(scope, {
      super: nameOf(supers.options, scope.super_category_id),
      category: nameOf(cats.options, scope.category_id),
      sub: nameOf(subs.options, scope.sub_category_id),
    });
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
      getOptionDisabled={(id) => disabledSet.has(id)}
      loading={loading}
      disabled={disabled}
      renderInput={(p) => <TextField {...p} label={label} size="small" />}
    />
  );

  const catRequired = cats.options.length > 0;
  const subRequired = subs.options.length > 0;

  return (
    <Stack spacing={2}>
      {field('Super Category *', 'super_category_id', supers.options, supers.loading, false)}
      {field(catRequired ? 'Category *' : 'Category', 'category_id', cats.options, cats.loading, !scope.super_category_id)}
      {field(subRequired ? 'Sub-Category *' : 'Sub-Category', 'sub_category_id', subs.options, subs.loading, !scope.category_id)}
      {error && <Alert severity="warning">{error}</Alert>}
      <Button
        variant="contained"
        size="large"
        disabled={submitting}
        onClick={onSubmit}
        sx={{ borderRadius: 999, fontWeight: 900 }}
      >
        {submitting ? 'Loading…' : 'Continue'}
      </Button>
    </Stack>
  );
}
