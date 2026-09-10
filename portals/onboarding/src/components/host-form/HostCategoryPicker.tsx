import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { AdminCategorySelect, EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import type { HostCategoryValue } from '../../forms/host';

interface Props {
  /** sub_category_ids already assigned — offered picks that duplicate them are blocked. */
  existingSubIds: string[];
  onAdd: (category: HostCategoryValue) => void;
  disabled?: boolean;
}

/** Cascading Super → Category → Sub picker with an Add button.
 *
 * Built on the ONE common cascade (`@duncit/category` — the same picker the
 * club form, admin Roles dialog and pod form use); this used to be a
 * hand-rolled triple of TextField selects, i.e. a rule-40 duplicate. The
 * external contract is unchanged: `onAdd` still receives the full denormalized
 * HostCategoryValue with a blank request_no. */
export default function HostCategoryPicker({ existingSubIds, onAdd, disabled = false }: Readonly<Props>) {
  const [value, setValue] = useState<AdminCategoryValue>(EMPTY_CATEGORY);

  const complete = !!(value.super_id && value.category_id && value.sub_id);
  const duplicate = complete && existingSubIds.includes(value.sub_id);
  const canAdd = !disabled && complete && !duplicate;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      super_category_id: value.super_id,
      category_id: value.category_id,
      sub_category_id: value.sub_id,
      super_category_name: value.super_name,
      category_name: value.category_name,
      sub_category_name: value.sub_name,
      request_no: '',
    });
    setValue(EMPTY_CATEGORY);
  };

  return (
    <Stack spacing={0.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{
        alignItems: { md: 'flex-start' }
      }}>
        <AdminCategorySelect value={value} onChange={setValue} direction="row" disabled={disabled} />
        <DuncitButton
          variant="outlined" size="small" startIcon={<AddIcon />} disabled={!canAdd}
          onClick={handleAdd} sx={{ mt: { md: 0.5 }, whiteSpace: 'nowrap' }}
        >
          Add
        </DuncitButton>
      </Stack>
      {duplicate && (
        <Typography variant="caption" color="error">
          Already added
        </Typography>
      )}
    </Stack>
  );
}
