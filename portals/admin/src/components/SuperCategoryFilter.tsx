import { gql, useQuery } from '@apollo/client';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

/** The platform's top-level split — "For You" / "For Your Pet" today, whatever
 * Admin > Categories holds tomorrow. Read live rather than hardcoded: a third
 * super category must appear in these filters without a release. */
const SUPER_CATEGORIES = gql`
  query AdminSuperCategories {
    categories(filter: { level: SUPER, parent_id: null }) {
      id
      name
    }
  }
`;

interface SuperCategoryOption {
  id: string;
  name: string;
}

interface Props {
  value: string;
  onChange: (superCategoryId: string) => void;
}

/**
 * Super Category filter shared by Admin > Clubs and Admin > Venues.
 *
 * Both entities carry the same classification, so one control keeps the two
 * pages reading the same option list — and keeps the empty value meaning the
 * same thing on both (no filter, not "uncategorised").
 */
export default function SuperCategoryFilter({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data } = useQuery(SUPER_CATEGORIES);
  const options = (data?.categories ?? []) as SuperCategoryOption[];

  return (
    <TextField
      size="small"
      select
      label={t('admin.filters.superCategory')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 220 }}
    >
      <MenuItem value="">{t('admin.filters.allSuperCategories')}</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
