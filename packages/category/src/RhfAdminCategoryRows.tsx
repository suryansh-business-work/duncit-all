import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Box, Button, Chip, FormHelperText, IconButton, Stack } from '@mui/material';
import {
  get,
  useFieldArray,
  useFormState,
  useWatch,
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import type { AdminCategorySelectProps } from './AdminCategorySelect';
import { Fieldset } from './Fieldset';
import { RhfAdminCategory } from './RhfAdminCategory';
import { categoryRowsMessage, duplicateCategoryRows } from './categoryRows';
import { EMPTY_CATEGORY, type AdminCategoryValue, type CategoryLevel } from './types';

/** Every word the rows field renders — the calling surface translates them. */
export interface AdminCategoryRowsLabels {
  /** The add button. */
  add: string;
  /** Accessible name of a row's remove button; `position` counts from 1. */
  remove: (position: number) => string;
  /** Accessible name of a row's group of dropdowns. Omit and a row is not a named group. */
  row?: (position: number) => string;
  /** Marks the first row. Omit and no row is marked. */
  primary?: string;
  /** Sub-level error of a row repeating an earlier row's sub category. Omit and repeats are not flagged. */
  duplicate?: string;
  /** Shown under the add button once `max` rows exist. */
  maxReached?: string;
}

type PickerProps = Omit<AdminCategorySelectProps, 'value' | 'onChange' | 'errors' | 'labels' | 'legend' | 'hint'>;

export interface RhfAdminCategoryRowsProps<T extends FieldValues> extends PickerProps {
  control: Control<T>;
  /** Form field holding the list: an array of whole `AdminCategoryValue` objects, primary first. */
  name: ArrayPath<T>;
  labels: AdminCategoryRowsLabels;
  /** The package ships no icon set: pass the surface's own (`@mui/icons-material`). */
  icons: { add: ReactNode; remove: ReactNode };
  /** A row cannot be removed at or below this many (default 1). */
  min?: number;
  /** The add button is disabled at this many (default: no cap). */
  max?: number;
  /** Per-level label overrides, passed to every row's picker. */
  levelLabels?: Partial<Record<CategoryLevel, string>>;
  /** When set, wrap the rows in a titled <fieldset> with this legend. */
  legend?: string;
  hint?: string;
  /** Swap in the surface's own buttons (`DuncitButton` / `DuncitIconButton`). */
  components?: { Button?: typeof Button; IconButton?: typeof IconButton };
  /** Prefix of every `data-testid` (default `category-rows`). */
  testId?: string;
  /** Called after a row's pick is written to the form — e.g. to re-validate the list once it has failed. */
  onRowChange?: (index: number, value: AdminCategoryValue) => void;
}

const NO_DUPLICATES: ReadonlySet<number> = new Set<number>();

/**
 * Several categories in one form field: a repeatable row of the cascading
 * Super → Category → Sub picker, the first row being the primary. Stores an
 * array of `AdminCategoryValue` at `name` (a `useFieldArray`). `disabled`
 * renders the rows read-only — no add, no remove.
 */
export function RhfAdminCategoryRows<T extends FieldValues>({
  control,
  name,
  labels,
  icons,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  levelLabels,
  legend,
  hint,
  components,
  testId = 'category-rows',
  onRowChange,
  disabled = false,
  ...picker
}: Readonly<RhfAdminCategoryRowsProps<T>>) {
  const AddButton = components?.Button ?? Button;
  const RemoveButton = components?.IconButton ?? IconButton;
  const path = name as string as Path<T>;
  const { fields, append, remove } = useFieldArray({ control, name });
  // The array's own snapshot only moves on add/remove; the live picks decide duplicates.
  const values = (useWatch({ control, name: path }) ?? []) as AdminCategoryValue[];
  const { errors } = useFormState({ control, name: path });
  const listError = categoryRowsMessage(get(errors, name));
  const duplicates = labels.duplicate ? duplicateCategoryRows(values) : NO_DUPLICATES;
  const atMax = fields.length >= max;

  // Removing a row removes the button that had focus: hand it to "add" rather
  // than letting it fall back to the top of the page.
  const addId = useId();
  const focusAdd = useRef(false);
  useEffect(() => {
    if (!focusAdd.current) return;
    focusAdd.current = false;
    document.getElementById(addId)?.focus();
  }, [fields.length, addId]);

  const rows = (
    <Stack spacing={2} data-testid={testId}>
      {fields.map((field, index) => {
        const rowLabel = labels.row?.(index + 1);
        return (
          <Stack
            key={field.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'flex-start' }}
            data-testid={`${testId}-row-${index}`}
            {...(rowLabel ? { role: 'group', 'aria-label': rowLabel } : {})}
          >
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              {index === 0 && labels.primary ? (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={labels.primary}
                  sx={{ alignSelf: 'flex-start' }}
                  data-testid={`${testId}-primary`}
                />
              ) : null}
              <RhfAdminCategory
                {...picker}
                control={control}
                name={`${name}.${index}` as Path<T>}
                disabled={disabled}
                labels={levelLabels}
                subError={duplicates.has(index) ? labels.duplicate : undefined}
                onValueChange={(value) => onRowChange?.(index, value)}
              />
            </Stack>
            {disabled ? null : (
              <RemoveButton
                aria-label={labels.remove(index + 1)}
                color="error"
                disabled={fields.length <= min}
                onClick={() => {
                  focusAdd.current = true;
                  remove(index);
                }}
                sx={{ mt: 1 }}
                data-testid={`${testId}-remove-${index}`}
              >
                {icons.remove}
              </RemoveButton>
            )}
          </Stack>
        );
      })}
      {listError ? (
        <FormHelperText error role="alert" sx={{ mx: 0 }} data-testid={`${testId}-error`}>
          {listError}
        </FormHelperText>
      ) : null}
      {disabled ? null : (
        <Box>
          <AddButton
            id={addId}
            variant="outlined"
            startIcon={icons.add}
            disabled={atMax}
            onClick={() => append({ ...EMPTY_CATEGORY } as FieldArray<T, ArrayPath<T>>)}
            data-testid={`${testId}-add`}
          >
            {labels.add}
          </AddButton>
          {atMax && labels.maxReached ? (
            <FormHelperText sx={{ mx: 0 }} data-testid={`${testId}-max`}>
              {labels.maxReached}
            </FormHelperText>
          ) : null}
        </Box>
      )}
    </Stack>
  );

  return legend ? (
    <Fieldset legend={legend} hint={hint}>
      {rows}
    </Fieldset>
  ) : (
    rows
  );
}
