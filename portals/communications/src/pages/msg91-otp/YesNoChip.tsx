import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

/** A yes/no cell: filled green for yes, quiet for no. */
export default function YesNoChip({ value }: Readonly<{ value: boolean }>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      color={value ? 'success' : 'default'}
      variant={value ? 'filled' : 'outlined'}
      label={value ? t('shell.common.yes') : t('shell.common.no')}
    />
  );
}
