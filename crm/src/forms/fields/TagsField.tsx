import { useField } from 'formik';
import { Autocomplete, Chip, TextField } from '@mui/material';

interface Props {
  name: string;
  label?: string;
  helperText?: string;
  /**
   * Suggestion pool — recent / popular tags that should appear in the
   * dropdown. Free-text entries (typed + Enter) are still accepted.
   */
  suggestions?: string[];
}

/**
 * Free-text multi-tag input bound to Formik. Stores `string[]`. Drops blank
 * tokens on add and lower-cases for de-duplication. Optional `suggestions`
 * power the dropdown but `freeSolo` lets the user create new tags too.
 */
export default function TagsField({ name, label = 'Tags', helperText, suggestions = [] }: Props) {
  const [field, , helpers] = useField<string[]>(name);
  const value = field.value ?? [];

  return (
    <Autocomplete
      multiple
      freeSolo
      autoSelect
      options={suggestions}
      value={value}
      onChange={(_, next) => {
        // De-dupe (case-insensitive) + strip whitespace + drop empties.
        const seen = new Set<string>();
        const cleaned: string[] = [];
        for (const raw of next) {
          const t = (typeof raw === 'string' ? raw : '').trim();
          if (!t) continue;
          const key = t.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          cleaned.push(t);
        }
        helpers.setValue(cleaned);
      }}
      onBlur={() => helpers.setTouched(true)}
      renderTags={(tags, getTagProps) =>
        tags.map((tag, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip key={key} {...tagProps} label={tag} size="small" variant="outlined" />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          placeholder={value.length ? 'Add another…' : 'Type and press Enter'}
          helperText={helperText ?? 'Optional — free-text tags for grouping / search.'}
        />
      )}
    />
  );
}
