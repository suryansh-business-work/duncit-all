import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { CATEGORIES, type CategoryOption } from '../../pages/hosts-page/queries';
import type { HostCategoryValue } from '../../forms/host';

interface Props {
  /** sub_category_ids already assigned — offered picks that duplicate them are blocked. */
  existingSubIds: string[];
  onAdd: (category: HostCategoryValue) => void;
  disabled?: boolean;
}

type Level = 'SUPER' | 'CATEGORY' | 'SUB';

const useLevel = (level: Level, parentId: string) => {
  const skip = level !== 'SUPER' && !parentId;
  const { data } = useQuery<{ categories: CategoryOption[] }>(CATEGORIES, {
    variables: { level, parent_id: level === 'SUPER' ? null : parentId },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  return (data?.categories ?? [])
    .filter((c) => c.is_active !== false)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
};

/** Cascading Super → Category → Sub picker with an Add button. Resolves the
 * selected names locally so a freshly-added category shows immediately. */
export default function HostCategoryPicker({ existingSubIds, onAdd, disabled = false }: Readonly<Props>) {
  const [superId, setSuperId] = useState('');
  const [catId, setCatId] = useState('');
  const [subId, setSubId] = useState('');

  const supers = useLevel('SUPER', '');
  const cats = useLevel('CATEGORY', superId);
  const subs = useLevel('SUB', catId);

  const nameOf = (list: CategoryOption[], id: string) => list.find((c) => c.id === id)?.name ?? '';
  const duplicate = useMemo(() => !!subId && existingSubIds.includes(subId), [subId, existingSubIds]);
  const canAdd = !disabled && !!superId && !!catId && !!subId && !duplicate;

  const reset = () => {
    setSuperId('');
    setCatId('');
    setSubId('');
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      super_category_id: superId,
      category_id: catId,
      sub_category_id: subId,
      super_category_name: nameOf(supers, superId),
      category_name: nameOf(cats, catId),
      sub_category_name: nameOf(subs, subId),
      request_no: '',
    });
    reset();
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'flex-start' }}>
      <TextField
        select size="small" label="Super category" value={superId} disabled={disabled}
        onChange={(e) => { setSuperId(e.target.value); setCatId(''); setSubId(''); }}
        sx={{ minWidth: 170, flex: 1 }}
      >
        <MenuItem value="">Select</MenuItem>
        {supers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField
        select size="small" label="Category" value={catId} disabled={disabled || !superId}
        onChange={(e) => { setCatId(e.target.value); setSubId(''); }}
        sx={{ minWidth: 170, flex: 1 }}
      >
        <MenuItem value="">Select</MenuItem>
        {cats.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField
        select size="small" label="Sub category" value={subId} disabled={disabled || !catId}
        error={duplicate}
        helperText={duplicate ? 'Already added' : ' '}
        onChange={(e) => setSubId(e.target.value)}
        sx={{ minWidth: 170, flex: 1 }}
      >
        <MenuItem value="">Select</MenuItem>
        {subs.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <Button
        variant="outlined" size="small" startIcon={<AddIcon />} disabled={!canAdd}
        onClick={handleAdd} sx={{ mt: { md: 0.5 }, whiteSpace: 'nowrap' }}
      >
        Add
      </Button>
    </Stack>
  );
}
