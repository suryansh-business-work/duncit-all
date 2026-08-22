import { Alert, Button, Card, CardContent, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { AdminCategorySelect, EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import { useTranslation } from '@duncit/shell';

export interface HostProfileSummary {
  id: string;
  status: string;
}

interface Props {
  /** Null when this user has never onboarded as a host. */
  hostProfile: HostProfileSummary | null;
  rows: AdminCategoryValue[];
  setRows: (next: AdminCategoryValue[]) => void;
}

/** A row is only saveable once all three levels are chosen — the server rejects
 * a partial triple, so there is no point sending one. */
export const isCompleteRow = (row: AdminCategoryValue) =>
  !!(row.super_id && row.category_id && row.sub_id);

/**
 * The categories a host may operate in, edited from the Roles dialog.
 *
 * These live on the HOST PROFILE, not on the role — granting the HOST role does
 * not create a profile. So when a user has never onboarded there is nothing to
 * attach categories to, and this says so rather than inventing an onboarding
 * record. Uses the one common cascade (`@duncit/category`), same as the club form.
 */
export default function HostCategoriesSection({ hostProfile, rows, setRows }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!hostProfile) {
    return (
      <Alert severity="info" sx={{ mt: 2 }} data-testid="host-categories-no-profile">
        This user has no host profile yet, so there is nothing to attach categories to. Granting the
        Host role here is fine — create the profile in the Onboarding portal, and its categories can
        be set from there or back here afterwards.
      </Alert>
    );
  }

  const update = (index: number, next: AdminCategoryValue) =>
    setRows(rows.map((row, i) => (i === index ? next : row)));
  const remove = (index: number) => setRows(rows.filter((_, i) => i !== index));

  return (
    <Card variant="outlined" sx={{ mt: 2 }} data-testid="host-categories">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Host categories
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Which Super → Category → Sub this host may create pods in. A host can hold several.
        </Typography>
        <Stack spacing={1.5}>
          {rows.map((row, index) => (
            <Stack
              // The cascade has no id of its own; the sub pins a completed row and
              // the index only ever backs a still-empty one (S6479).
              key={row.sub_id || `new-${index}`}
              direction="row"
              spacing={1}
              alignItems="flex-start"
            >
              <AdminCategorySelect
                value={row}
                onChange={(next) => update(index, next)}
                direction="row"
              />
              <IconButton
                aria-label={t('admin.roles.removeCategory')}
                color="error"
                onClick={() => remove(index)}
                sx={{ mt: 1 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" data-testid="host-categories-empty">
              No categories yet — this host cannot create pods until one is added.
            </Typography>
          )}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setRows([...rows, EMPTY_CATEGORY])}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add category
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
