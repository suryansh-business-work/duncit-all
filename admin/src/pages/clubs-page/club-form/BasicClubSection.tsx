import { MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import type { ClubForm } from '../queries';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  superCats: any[];
  subCats: any[];
}

export default function BasicClubSection({ form, setForm, superCats, subCats }: Props) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Club name" value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} fullWidth required />
        <TextField label="Club ID" value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })} disabled={!!form.id} helperText={form.id ? 'ID cannot be changed' : 'Auto from name if blank'} fullWidth />
      </Stack>
      <TextField label="Description" value={form.club_description} onChange={(e) => setForm({ ...form, club_description: e.target.value })} fullWidth multiline minRows={2} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Super Category" select value={form.super_category_id} onChange={(e) => setForm({ ...form, super_category_id: e.target.value })} fullWidth helperText="Drives the app feed grouping.">
          <MenuItem value="">None</MenuItem>
          {superCats.map((category: any) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        <TextField label="Category (sub-category)" select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} fullWidth>
          <MenuItem value="">None</MenuItem>
          {subCats.map((category: any) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        {form.id && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch checked={form.is_active} onChange={(_, value) => setForm({ ...form, is_active: value })} />
            <Typography variant="body2">{form.is_active ? 'Active' : 'Inactive'}</Typography>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}