import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useDebouncedValue } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import {
  EXPENSE_RELATED_ENTITIES,
  EXPENSE_RELATED_ENTITY,
  type ExpenseRelatedEntity,
} from './queries';

interface Props {
  /** The chosen Related From type's key. Empty disables the picker. */
  typeKey: string;
  /** The chosen entity's document id, or ''. */
  value: string;
  /** The name already stored on the expense, shown until the server answers. */
  valueName?: string;
  onChange: (entityId: string) => void;
  label: string;
  helperText?: string;
}

const optionLabel = (entity: ExpenseRelatedEntity) => entity.name || entity.reference || entity.id;

/**
 * The searchable entity list behind "Expense Related From".
 *
 * It searches the SERVER on every keystroke rather than filtering a downloaded
 * list: the five sources it can point at include every pod and every venue on
 * the platform, and a dropdown that has to hold them all is a dropdown that
 * stops opening.
 *
 * The type is a prop and not a second query here, so switching type from Venue
 * to Host re-searches a different collection with no code aware of which.
 */
export default function RelatedEntityPicker({
  typeKey,
  value,
  valueName,
  onChange,
  label,
  helperText,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const term = useDebouncedValue(input.trim(), 300);

  const { data, loading } = useQuery<{ expenseRelatedEntities: ExpenseRelatedEntity[] }>(
    EXPENSE_RELATED_ENTITIES,
    {
      variables: { type_key: typeKey, search: term || null },
      skip: !typeKey,
      fetchPolicy: 'cache-and-network',
    },
  );

  // A saved expense arrives with an id and, if it was filed before the entity
  // was renamed, a stale name. The id is re-read so the picker shows what the
  // entity is called TODAY while the row keeps what it was called then.
  const listed = (data?.expenseRelatedEntities ?? []).some((entity) => entity.id === value);
  const { data: seedData } = useQuery<{ expenseRelatedEntity: ExpenseRelatedEntity | null }>(
    EXPENSE_RELATED_ENTITY,
    {
      variables: { type_key: typeKey, entity_id: value },
      skip: !typeKey || !value || listed,
      fetchPolicy: 'cache-first',
    },
  );

  const options = useMemo(() => {
    const rows = data?.expenseRelatedEntities ?? [];
    const seed = seedData?.expenseRelatedEntity;
    if (seed && !rows.some((row) => row.id === seed.id)) return [seed, ...rows];
    return rows;
  }, [data, seedData]);

  const selected =
    options.find((entity) => entity.id === value) ??
    // Neither list has answered yet: fall back to the name the expense stored,
    // so an edit never flashes an empty box over a relation that is set.
    (value ? { id: value, name: valueName ?? '', reference: '' } : null);

  return (
    <Autocomplete<ExpenseRelatedEntity, false, false, false>
      options={options}
      value={selected}
      loading={loading}
      disabled={!typeKey}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
      filterOptions={(all) => all}
      onInputChange={(_event, next) => setInput(next)}
      onChange={(_event, next) => onChange(next?.id ?? '')}
      noOptionsText={
        typeKey ? t('finance.expenseConfig.noEntities') : t('finance.expenseConfig.pickTypeFirst')
      }
      renderOption={(props, entity) => {
        const { key, ...rest } = props as { key: string } & Record<string, unknown>;
        return (
          <li key={key} {...rest}>
            <Stack sx={{ lineHeight: 1.2 }}>
              <Typography variant="body2">{optionLabel(entity)}</Typography>
              {entity.reference && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {entity.reference}
                </Typography>
              )}
            </Stack>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText ?? ' '}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
