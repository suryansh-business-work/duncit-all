import { Autocomplete, Chip, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  helperText?: string;
  max?: number;
}

export default function TagsInput({
  value,
  onChange,
  label,
  helperText,
  max = 20,
}: Readonly<TagsInputProps>) {
  const { t } = useTranslation();
  const fieldLabel = label ?? t('products.media.tags');
  const hint = helperText ?? t('products.media.tagsHint');
  return (
    <Autocomplete
      multiple
      freeSolo
      options={[]}
      value={value}
      onChange={(_e, next) => {
        const cleaned = (next as string[])
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        onChange(Array.from(new Set(cleaned)).slice(0, max));
      }}
      renderTags={(items, getTagProps) =>
        items.map((option, index) => (
          <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} />
        ))
      }
      renderInput={(params) => (
        <TextField {...params} label={fieldLabel} helperText={hint} />
      )}
    />
  );
}
