import { useFieldArray, useFormContext } from 'react-hook-form';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VerifiedIcon from '@mui/icons-material/Verified';
import HostCategoryPicker from './HostCategoryPicker';
import type { HostCategoryValue, HostEditValues } from '../../forms/host';

const path = (c: HostCategoryValue) =>
  [c.super_category_name, c.category_name, c.sub_category_name].filter(Boolean).join(' › ') ||
  'Category';

/** Manage a host's operating categories (multi Super → Category → Sub). Shows
 * the categories the host requested (with their request no.) and lets an admin
 * add or remove more so one host can operate across several super-categories. */
export default function HostCategoriesSection() {
  const { control } = useFormContext<HostEditValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'categories' });
  const existingSubIds = fields.map((f) => (f as unknown as HostCategoryValue).sub_category_id);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2" fontWeight={800}>
          Host categories
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Categories this host operates in. A host can work across multiple super-categories —
          requested categories are marked, and you can add or remove more here.
        </Typography>
      </Box>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No categories assigned yet. Add the first one below.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {fields.map((field, index) => {
            const category = field as unknown as HostCategoryValue;
            const requested = !!category.request_no;
            return (
              <Stack
                key={field.id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ p: 1, borderRadius: 1.5, border: 1, borderColor: 'divider' }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {path(category)}
                  </Typography>
                  {requested ? (
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      icon={<VerifiedIcon />}
                      label={`Requested · ${category.request_no}`}
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Chip size="small" variant="outlined" label="Added by admin" sx={{ mt: 0.5 }} />
                  )}
                </Box>
                <Tooltip title="Remove category">
                  <IconButton size="small" color="error" aria-label={`Remove ${path(category)}`} onClick={() => remove(index)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            );
          })}
        </Stack>
      )}

      <HostCategoryPicker
        existingSubIds={existingSubIds}
        onAdd={(category) => append(category)}
      />
    </Stack>
  );
}
