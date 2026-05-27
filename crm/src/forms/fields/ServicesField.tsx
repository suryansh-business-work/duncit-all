import { useMemo } from 'react';
import { FieldArray, useField } from 'formik';
import {
  Autocomplete,
  Box,
  Card,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FormField from '../FormField';
import type { CrmServiceOffered } from '../../api/crm.types';

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
 * value becomes a Formik row in `name`, which keeps its own description input
 * below the picker. Catalogue values come from the parent (per-kind catalogue
 * — see ManageServicesPage). Free-text entries land as `{ service: "Other",
 * custom_name: typedValue }` so dashboard aggregations still group cleanly.
 */
export default function ServicesField({ name, options }: Props) {
  const [field] = useField<CrmServiceOffered[]>(name);
  const rows = field.value ?? [];

  // Names already selected, in display form — used both to populate the
  // Autocomplete's `value` and to filter out duplicates in its option list.
  const selectedNames = useMemo(() => rows.map(displayName).filter(Boolean), [rows]);
  const availableOptions = useMemo(() => {
    const taken = new Set(selectedNames);
    return options.filter((o) => !taken.has(o));
  }, [options, selectedNames]);

  return (
    <FieldArray name={name}>
      {(arrayHelpers) => {
        const handleChange = (
          _e: unknown,
          next: string[],
          reason: string,
          detail?: { option: string }
        ) => {
          if (reason === 'selectOption' || reason === 'createOption') {
            const picked = (detail?.option ?? '').trim();
            if (!picked) return;
            // De-dupe: ignore if already in the list (Autocomplete should have
            // filtered, but `freeSolo` lets users press Enter on a substring of
            // an existing label).
            if (selectedNames.some((n) => n.toLowerCase() === picked.toLowerCase())) return;
            const isCatalogue = options.some((o) => o === picked);
            if (isCatalogue && picked !== 'Other') {
              arrayHelpers.push({ service: picked, custom_name: '', description: '' });
            } else {
              // "Other" catalogue value OR a free-typed name — both stored as
              // Other + custom_name so the aggregate dashboard can group them
              // under their human label.
              const customName = picked === 'Other' ? '' : picked;
              arrayHelpers.push({ service: 'Other', custom_name: customName, description: '' });
            }
          } else if (reason === 'removeOption') {
            // MUI tells us the new value list — find the dropped one against
            // current display names and splice that row.
            const removed = selectedNames.find((n) => !next.includes(n));
            if (!removed) return;
            const idx = rows.findIndex((r) => displayName(r) === removed);
            if (idx >= 0) arrayHelpers.remove(idx);
          } else if (reason === 'clear') {
            for (let i = rows.length - 1; i >= 0; i -= 1) arrayHelpers.remove(i);
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
              onChange={handleChange as any}
              renderTags={() => null /* rows are rendered below with description editors */}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Services"
                  placeholder={rows.length ? 'Search to add more…' : 'Search and select services…'}
                  helperText="Type to search the catalogue. Press Enter on a custom name to add it as Other."
                />
              )}
            />

            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No services added yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {rows.map((row, index) => {
                  const label = displayName(row) || 'Untitled service';
                  return (
                    <Card key={index} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 1 }}
                        useFlexGap
                        flexWrap="wrap"
                      >
                        <Chip
                          label={label}
                          color="primary"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        {row.service === 'Other' && (
                          <Chip label="Custom" size="small" variant="outlined" />
                        )}
                        <Box sx={{ flex: 1 }} />
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="remove service"
                          onClick={() => arrayHelpers.remove(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      {row.service === 'Other' && (
                        <Box sx={{ mb: 1 }}>
                          <FormField
                            name={`${name}.${index}.custom_name`}
                            label="Custom service name"
                            size="small"
                          />
                        </Box>
                      )}
                      <FormField
                        name={`${name}.${index}.description`}
                        label="Description"
                        size="small"
                        multiline
                        minRows={2}
                        placeholder="What does this service include?"
                      />
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Stack>
        );
      }}
    </FieldArray>
  );
}
