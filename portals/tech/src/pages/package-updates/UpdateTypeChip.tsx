import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { UPDATE_TYPE_COLOR, updateTypeLabel, type UpdateType } from './queries';

/**
 * How far behind one dependency is, as a chip.
 *
 * Module scope on purpose: both tables and the per-manifest dialog render it
 * from a column definition, and a component declared inside those would be a
 * new type on every render (S6478).
 */
export default function UpdateTypeChip({ type }: Readonly<{ type: UpdateType }>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      variant={type === 'MAJOR' ? 'filled' : 'outlined'}
      color={UPDATE_TYPE_COLOR[type]}
      label={updateTypeLabel(t, type)}
    />
  );
}
