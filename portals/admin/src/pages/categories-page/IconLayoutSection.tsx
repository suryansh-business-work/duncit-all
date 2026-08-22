import { useState } from 'react';
import {
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CategoryIconLayout, CategoryIconPosition, FormState } from './queries';
import { useTranslation } from '@duncit/shell';

/** Server default applied the first time an admin edits a surface's layout. */
const DEFAULT_ICON_LAYOUT: CategoryIconLayout = { position: 'TOP', width: 40, height: 40 };

type Translate = ReturnType<typeof useTranslation>['t'];

const positionOptions = (t: Translate): ReadonlyArray<{ value: CategoryIconPosition; label: string }> => [
  { value: 'TOP', label: t('admin.categories.layoutTop') },
  { value: 'LEFT', label: t('admin.categories.layoutLeft') },
  { value: 'RIGHT', label: t('admin.categories.layoutRight') },
  { value: 'BOTTOM', label: t('admin.categories.layoutBottom') },
];

type IconSurface = 'MWEB' | 'NATIVE';

interface Props {
  form: FormState;
  onFormChange: (form: FormState) => void;
}

/**
 * Icon layout controls for a CATEGORY-level category. The surface toggle picks
 * which layout (`icon_layout_mweb` vs `icon_layout_native`) the position/size
 * controls below edit; mWeb and Native are configured independently.
 */
export default function IconLayoutSection({ form, onFormChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [surface, setSurface] = useState<IconSurface>('MWEB');
  const raw = surface === 'MWEB' ? form.icon_layout_mweb : form.icon_layout_native;
  const layout = raw ?? DEFAULT_ICON_LAYOUT;

  const patchLayout = (patch: Partial<CategoryIconLayout>) => {
    const next: CategoryIconLayout = { ...layout, ...patch };
    if (surface === 'MWEB') {
      onFormChange({ ...form, icon_layout_mweb: next });
    } else {
      onFormChange({ ...form, icon_layout_native: next });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{t('admin.categories.iconLayout')}</Typography>
      <ToggleButtonGroup
        value={surface}
        exclusive
        size="small"
        onChange={(_event, next: IconSurface | null) => {
          if (next) setSurface(next);
        }}
      >
        <ToggleButton value="MWEB">mWeb</ToggleButton>
        <ToggleButton value="NATIVE">{t('admin.categories.layoutNative')}</ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup
        value={layout.position}
        exclusive
        size="small"
        onChange={(_event, next: CategoryIconPosition | null) => {
          if (next) patchLayout({ position: next });
        }}
      >
        {positionOptions(t).map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Stack direction="row" spacing={2}>
        <TextField
          label={t('admin.categories.iconWidth')}
          type="number"
          value={layout.width}
          onChange={(e) => patchLayout({ width: Number(e.target.value) || 0 })}
          helperText="px"
          sx={{ maxWidth: 160 }}
        />
        <TextField
          label={t('admin.categories.iconHeight')}
          type="number"
          value={layout.height}
          onChange={(e) => patchLayout({ height: Number(e.target.value) || 0 })}
          helperText="px"
          sx={{ maxWidth: 160 }}
        />
      </Stack>
    </Stack>
  );
}
