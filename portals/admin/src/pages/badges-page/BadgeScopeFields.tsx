import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { needsCategory, needsRole, type BadgeForm } from './queries';

export interface BadgeCategoryOption {
  id: string;
  name: string;
  level: string;
}

export interface BadgeRoleOption {
  key: string;
  name: string;
}

interface Props {
  form: BadgeForm;
  setForm: (f: BadgeForm) => void;
  categories: readonly BadgeCategoryOption[];
  roles: readonly BadgeRoleOption[];
}

/**
 * The two fields only some conditions need: the category a category-scoped
 * badge counts pods in, and the role a partner badge unlocks on. Split out of
 * the dialog so neither file carries a branch it does not own.
 */
export default function BadgeScopeFields({ form, setForm, categories, roles }: Readonly<Props>) {
  const { t } = useTranslation();

  if (needsCategory(form.condition_type)) {
    return (
      <TextField
        select
        label={t('admin.badgesPage.category')}
        helperText={t('admin.badgesPage.categoryHint')}
        value={form.category_id}
        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
        fullWidth
      >
        <MenuItem value="">{t('admin.badgesPage.categoryNone')}</MenuItem>
        {categories.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name} · {c.level}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (needsRole(form.condition_type)) {
    return (
      <TextField
        select
        label={t('admin.badgesPage.role')}
        helperText={t('admin.badgesPage.roleHint')}
        value={form.role_key}
        onChange={(e) => setForm({ ...form, role_key: e.target.value })}
        fullWidth
      >
        {roles.map((r) => (
          <MenuItem key={r.key} value={r.key}>
            {r.name}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return null;
}
