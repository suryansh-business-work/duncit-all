import { useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Autocomplete, Box, Card, Chip, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import { FormField } from '@duncit/forms';
import type { CrmServiceOffered } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export const emptyService: CrmServiceOffered = {
  service: '',
  custom_name: '',
  description: '',
};

interface Props {
  name: string;
  options: string[];
}

// Display label for a row: catalogue value, or the user-typed name when the
// catalogue value is "Other". Blank rows are dropped on save.
function displayName(row: CrmServiceOffered): string {
  if (row.service === 'Other') return (row.custom_name ?? '').trim() || 'Other';
  return (row.service ?? '').trim();
}

/**
 * Autocomplete-driven multi-select for the services-offered field. Each picked
 * value becomes a RHF row in `name`, which keeps its own description input
 * below the picker. Catalogue values come from the parent (per-kind catalogue
 * — see ManageServicesPage). Free-text entries land as `{ service: "Other",
 * custom_name: typedValue }` so dashboard aggregations still group cleanly.
 */
export default function ServicesField({ name, options }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = (useWatch({ control, name }) as CrmServiceOffered[]) ?? [];

  // Names already selected, in display form — used both to populate the
  // Autocomplete's `value` and to filter out duplicates in its option list.
  const selectedNames = useMemo(() => rows.map(displayName).filter(Boolean), [rows]);
  const availableOptions = useMemo(() => {
    const taken = new Set(selectedNames);
    return options.filter((o) => !taken.has(o));
  }, [options, selectedNames]);

  const addPicked = (picked: string) => {
    // De-dupe: ignore if already in the list (Autocomplete should have
    // filtered, but `freeSolo` lets users press Enter on a substring of
    // an existing label).
    if (selectedNames.some((n) => n.toLowerCase() === picked.toLowerCase())) return;
    const isCatalogue = options.includes(picked);
    if (isCatalogue && picked !== 'Other') {
      append({ service: picked, custom_name: '', description: '' });
      return;
    }
    // "Other" catalogue value OR a free-typed name — both stored as
    // Other + custom_name so the aggregate dashboard can group them
    // under their human label.
    const customName = picked === 'Other' ? '' : picked;
    append({ service: 'Other', custom_name: customName, description: '' });
  };

  const removePicked = (next: string[]) => {
    const removed = selectedNames.find((n) => !next.includes(n));
    if (!removed) return;
    const idx = rows.findIndex((r) => displayName(r) === removed);
    if (idx >= 0) remove(idx);
  };

  const handleChange = (
    _e: unknown,
    next: string[],
    reason: string,
    detail?: { option: string }
  ) => {
    if (reason === 'selectOption' || reason === 'createOption') {
      const picked = (detail?.option ?? '').trim();
      if (picked) addPicked(picked);
    } else if (reason === 'removeOption') {
      removePicked(next);
    } else if (reason === 'clear') {
      remove();
    }
  };

  return (
    <Stack spacing={1.5}>
      <Autocomplete
        multiple
        freeSolo
        autoHighlight
        filterSelectedOptions
        options={availableOptions}
        value={selectedNames}
        onChange={handleChange as never}
        renderValue={() => null /* rows are rendered below with description editors */}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label={t('crm.common.services')}
            placeholder={rows.length ? 'Search to add more…' : 'Search and select services…'}
            helperText={t('crm.forms.typeToSearchTheCataloguePress')}
          />
        )}
      />

      {fields.length === 0 ? (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          No services added yet.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {fields.map((row, index) => {
            const current: CrmServiceOffered = rows[index] ?? row;
            const label = displayName(current) || 'Untitled service';
            return (
              <Card key={row.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    mb: 1
                  }}>
                  <Chip label={label} color="primary" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
                  {current.service === 'Other' && <Chip label={t('crm.common.custom')} size="small" variant="outlined" />}
                  <Box sx={{ flex: 1 }} />
                  <DuncitIconButton size="small" color="error" aria-label={t('crm.forms.removeService')} onClick={() => remove(index)}>
                    <DeleteIcon fontSize="small" />
                  </DuncitIconButton>
                </Stack>
                {current.service === 'Other' && (
                  <Box sx={{ mb: 1 }}>
                    <FormField name={`${name}.${index}.custom_name`} label={t('crm.forms.customServiceName')} size="small" />
                  </Box>
                )}
                <FormField
                  name={`${name}.${index}.description`}
                  label={t('shell.common.description')}
                  size="small"
                  multiline
                  minRows={2}
                  placeholder={t('crm.forms.whatDoesThisServiceInclude')}
                />
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
