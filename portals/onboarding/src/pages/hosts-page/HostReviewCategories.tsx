import { useState } from 'react';
import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import HostCategoryPicker from '../../components/host-form/HostCategoryPicker';
import type { HostCategoryValue } from '../../forms/host';

interface Props {
  categories: HostCategoryValue[];
  onSave: (categories: HostCategoryValue[]) => void;
  saving: boolean;
}

const pathOf = (category: HostCategoryValue) =>
  [category.super_category_name, category.category_name, category.sub_category_name]
    .filter(Boolean)
    .join(' › ');

/**
 * The host's operating categories, editable during review. The onboarding
 * meeting seeds one from the applicant's survey; the reviewer can correct or
 * extend it here without leaving the Review dialog — a host with no category
 * cannot create pods at all.
 */
export default function HostReviewCategories({ categories, onSave, saving }: Readonly<Props>) {
  const [rows, setRows] = useState<HostCategoryValue[]>(categories);
  const dirty =
    rows.length !== categories.length ||
    rows.some((row, i) => row.sub_category_id !== categories[i]?.sub_category_id);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid="review-host-categories">
      <Typography variant="subtitle2" fontWeight={800}>
        Host categories
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Which Super › Category › Sub this host may create pods in — seeded from their onboarding
        survey.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ my: 1 }}>
        {rows.map((row) => (
          <Chip
            key={row.sub_category_id}
            label={
              row.request_no ? `${pathOf(row)} · ${row.request_no}` : pathOf(row)
            }
            onDelete={() =>
              setRows(rows.filter((r) => r.sub_category_id !== row.sub_category_id))
            }
            sx={{ fontWeight: 700 }}
          />
        ))}
        {rows.length === 0 && (
          <Typography variant="body2" color="warning.main" data-testid="review-no-categories">
            No categories — this host cannot create pods until one is assigned.
          </Typography>
        )}
      </Stack>
      <HostCategoryPicker
        existingSubIds={rows.map((row) => row.sub_category_id)}
        onAdd={(next) => setRows([...rows, next])}
      />
      <Button
        variant="outlined"
        size="small"
        sx={{ mt: 1 }}
        onClick={() => onSave(rows)}
        disabled={saving || !dirty}
      >
        {saving ? 'Saving…' : 'Save categories'}
      </Button>
    </Paper>
  );
}
