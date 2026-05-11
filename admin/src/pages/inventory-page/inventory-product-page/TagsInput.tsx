import { Autocomplete, Chip, TextField } from '@mui/material';

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
  label = 'Tags',
  helperText = 'Press Enter to add a tag',
  max = 20,
}: TagsInputProps) {
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
        <TextField {...params} label={label} helperText={helperText} />
      )}
    />
  );
}
