import * as MuiIcons from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { MuiIconPicker } from '@duncit/ui';

interface Props {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  helperText?: string;
}

function resolveIcon(name: string): SvgIconComponent | null {
  if (!name) return null;
  const Comp = (MuiIcons as Record<string, SvgIconComponent>)[name];
  return Comp || null;
}

export function isImageIconValue(value: string | null | undefined) {
  const next = (value ?? '').trim();
  return /^data:image\//i.test(next) || /^https?:\/\//i.test(next) || next.startsWith('/');
}

export function renderIconByName(
  name: string | null | undefined,
  fontSize: 'small' | 'medium' | 'large' = 'small'
) {
  if (!name) return null;
  const Comp = resolveIcon(name);
  if (!Comp) return null;
  return <Comp fontSize={fontSize} />;
}

const reportIconListLoad = (error: unknown) =>
  logs.portal.admin.error('categories', 'IconPickerField', { error });

/** Admin's category icon field: the whole MUI icon list, searchable, or a pasted emoji. */
export default function IconPickerField({
  value,
  onChange,
  label,
  helperText,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <MuiIconPicker
      value={value || ''}
      onChange={onChange}
      label={label ?? t('admin.pickers.icon')}
      helperText={helperText ?? t('admin.pickers.iconHint')}
      onLoadError={reportIconListLoad}
    />
  );
}
