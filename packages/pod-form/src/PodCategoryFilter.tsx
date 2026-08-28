import { Alert, Box } from '@mui/material';
import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';
import { useTranslation } from './i18n/useTranslation';

interface Props {
  value: AdminCategoryValue;
  onChange: (next: AdminCategoryValue) => void;
  /** How many clubs survive the current filter — drives the empty warning. */
  matchCount: number;
  /** Hidden once a club is already chosen on an existing pod being edited. */
  clubCount: number;
}

/**
 * The pod's category, chosen FIRST — above every section of the form.
 *
 * A pod inherits its category from its club, so this does not persist anything
 * of its own: it narrows the club list to the Super + Sub picked here (a club
 * stores its Sub in `category_id`). Picking the category before the club is the
 * same order the host apps use, and it means the club dropdown is already scoped
 * the first time it is opened instead of re-filtering underneath the admin.
 */
export default function PodCategoryFilter({ value, onChange, matchCount, clubCount }: Readonly<Props>) {
  const { t } = useTranslation();
  const filtering = !!(value.super_id && value.sub_id);
  return (
    <Box data-testid="pod-category-filter">
      <AdminCategorySelect
        value={value}
        onChange={onChange}
        direction={{ xs: 'column', md: 'row' }}
        legend={t('podForm.autoPod.categoryLegend')}
        hint={t('podForm.autoPod.filterHint')}
      />
      {filtering && matchCount === 0 && clubCount > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }} data-testid="pod-category-no-clubs">
          {t('podForm.autoPod.noClubs')}
        </Alert>
      )}
    </Box>
  );
}
