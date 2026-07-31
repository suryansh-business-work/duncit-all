import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HostCategoryPicker from '../../../components/host-form/HostCategoryPicker';
import { categoryPath } from '../../../utils/categoryPath';
import type { HostCategoryValue } from '../../../forms/host';

interface Props {
  categories: HostCategoryValue[];
  /** What the applicant picked in the Earn with Duncit gate, from their
   * onboarding meeting. Null when they never booked one. */
  surveyCategory: HostCategoryValue | null;
  saving: boolean;
  /** Persists the whole list. Never rejects — the container surfaces errors. */
  onChange: (categories: HostCategoryValue[]) => Promise<boolean>;
}

const chipLabel = (c: HostCategoryValue) =>
  c.request_no ? `${categoryPath(c)} · ${c.request_no}` : categoryPath(c);

/**
 * The host's operating categories — a host with none cannot create pods at all.
 *
 * Every edit persists immediately: there is no Save button, so what the
 * reviewer sees is what is in the database. The list is controlled by the
 * container, which replaces it with the server's denormalized answer after each
 * write (that is where a triple's request_no linkage comes from).
 */
export default function HostReviewCategories({
  categories,
  surveyCategory,
  saving,
  onChange,
}: Readonly<Props>) {
  const subIds = categories.map((c) => c.sub_category_id);
  const surveyPending = !!surveyCategory && !subIds.includes(surveyCategory.sub_category_id);

  const remove = (subId: string) => onChange(categories.filter((c) => c.sub_category_id !== subId));
  const add = (next: HostCategoryValue) => onChange([...categories, next]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid="review-host-categories">
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
          Host categories
        </Typography>
        {saving && (
          <Typography variant="caption" color="text.secondary" data-testid="categories-saving">
            Saving…
          </Typography>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        Which Super › Category › Sub this host may create pods in. Changes save as you make them.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ my: 1 }}>
        {categories.map((c) => (
          <Chip
            key={c.sub_category_id}
            label={chipLabel(c)}
            disabled={saving}
            onDelete={() => remove(c.sub_category_id)}
            sx={{ fontWeight: 700 }}
          />
        ))}
        {categories.length === 0 && (
          <Typography variant="body2" color="warning.main" data-testid="review-no-categories">
            No categories — this host cannot create pods until one is assigned.
          </Typography>
        )}
      </Stack>

      {surveyCategory && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 1 }}
          data-testid="review-survey-category"
        >
          <Typography variant="caption" color="text.secondary">
            Applied with: <strong>{categoryPath(surveyCategory)}</strong>
          </Typography>
          {surveyPending && (
            <Button
              size="small"
              variant="text"
              startIcon={<AddIcon />}
              disabled={saving}
              onClick={() => add(surveyCategory)}
            >
              Add
            </Button>
          )}
        </Stack>
      )}

      <HostCategoryPicker existingSubIds={subIds} onAdd={add} disabled={saving} />
    </Paper>
  );
}
