import { useState } from 'react';
import { Autocomplete, Chip, Divider, MenuItem, Stack, TextField } from '@mui/material';
import { useCategoriesByParent } from '../../../api/useCategoryTree';
import ServiceTargetSwitches from './ServiceTargetSwitches';
import { useTranslation } from '@duncit/shell';

export interface ServiceOfferedDraft {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
  applies_to_venue: boolean;
  applies_to_host: boolean;
  titles: string[];
}

interface Props {
  value: ServiceOfferedDraft;
  onChange: (next: ServiceOfferedDraft) => void;
}

/**
 * Add-form body for a Service Offered: cascading Super → Category → Sub pickers
 * (each scopes the next) plus a free-entry multi-title input so several titles
 * can be added at once under one hierarchy slot.
 */
export default function ServiceOfferedForm({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [titleInput, setTitleInput] = useState('');
  const supers = useCategoriesByParent('SUPER');
  const cats = useCategoriesByParent('CATEGORY', value.super_category_id || null);
  const subs = useCategoriesByParent('SUB', value.category_id || null);

  const set = (patch: Partial<ServiceOfferedDraft>) => onChange({ ...value, ...patch });

  return (
    <Stack spacing={2} sx={{ mt: 0.5 }}>
      <TextField
        select
        size="small"
        label={t('crm.common.superCategory')}
        required
        value={value.super_category_id}
        onChange={(e) => set({ super_category_id: e.target.value, category_id: '', sub_category_id: '' })}
        helperText={t('crm.data.topLevelCategory')}
        fullWidth
      >
        {supers.options.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label={t('crm.common.category')}
        value={value.category_id}
        onChange={(e) => set({ category_id: e.target.value, sub_category_id: '' })}
        disabled={!value.super_category_id || cats.options.length === 0}
        helperText={value.super_category_id && cats.options.length === 0 ? 'No categories under this super category' : 'Optional'}
        fullWidth
      >
        {cats.options.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label={t('crm.common.subCategory')}
        value={value.sub_category_id}
        onChange={(e) => set({ sub_category_id: e.target.value })}
        disabled={!value.category_id || subs.options.length === 0}
        helperText={value.category_id && subs.options.length === 0 ? 'No sub-categories under this category' : 'Optional'}
        fullWidth
      >
        {subs.options.map((c) => (
          <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
        ))}
      </TextField>

      <Autocomplete
        multiple
        freeSolo
        size="small"
        options={[]}
        value={value.titles}
        inputValue={titleInput}
        onInputChange={(_, v) => setTitleInput(v)}
        onChange={(_, v) => {
          set({ titles: Array.from(new Set((v as string[]).map((t) => t.trim()).filter(Boolean))) });
          setTitleInput('');
        }}
        renderTags={(tags, getTagProps) =>
          tags.map((tag, index) => <Chip size="small" label={tag} {...getTagProps({ index })} key={tag} />)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('crm.data.serviceTitles')}
            required
            placeholder={t('crm.data.typeATitleAndPressEnter')}
            helperText={t('crm.data.addOneOrMoreEG')}
          />
        )}
      />

      <Divider flexItem />
      <ServiceTargetSwitches
        venue={value.applies_to_venue}
        host={value.applies_to_host}
        onChange={({ venue, host }) => set({ applies_to_venue: venue, applies_to_host: host })}
      />
    </Stack>
  );
}
