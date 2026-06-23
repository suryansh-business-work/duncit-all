import { gql, useQuery } from '@apollo/client';
import { MenuItem, Stack, TextField } from '@mui/material';

const CATS = gql`
  query ProductCategories($level: CategoryLevel!, $parent_id: ID) {
    categories(filter: { level: $level, parent_id: $parent_id }) {
      id
      name
    }
  }
`;

interface Props {
  superId: string;
  categoryId: string;
  subId: string;
  disabled?: boolean;
  error?: boolean;
  onChange: (next: { superId: string; categoryId: string; subId: string }) => void;
}

// Super → Category → Sub cascade off the shared Category collection (the same
// taxonomy pods use). Selecting a parent resets the levels below it.
export default function CategoryCascade({ superId, categoryId, subId, disabled, error, onChange }: Readonly<Props>) {
  const { data: supers } = useQuery(CATS, { variables: { level: 'SUPER' } });
  const { data: cats } = useQuery(CATS, { variables: { level: 'CATEGORY', parent_id: superId }, skip: !superId });
  const { data: subs } = useQuery(CATS, { variables: { level: 'SUB', parent_id: categoryId }, skip: !categoryId });

  const superList = supers?.categories ?? [];
  const catList = cats?.categories ?? [];
  const subList = subs?.categories ?? [];

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField
        select
        fullWidth
        required
        label="Super category"
        value={superId}
        disabled={disabled}
        error={error && !superId}
        onChange={(e) => onChange({ superId: e.target.value, categoryId: '', subId: '' })}
      >
        {superList.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField
        select
        fullWidth
        required
        label="Category"
        value={categoryId}
        disabled={disabled || !superId}
        error={error && !categoryId}
        onChange={(e) => onChange({ superId, categoryId: e.target.value, subId: '' })}
      >
        {catList.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField
        select
        fullWidth
        required
        label="Sub category"
        value={subId}
        disabled={disabled || !categoryId}
        error={error && !subId}
        onChange={(e) => onChange({ superId, categoryId, subId: e.target.value })}
      >
        {subList.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
    </Stack>
  );
}
