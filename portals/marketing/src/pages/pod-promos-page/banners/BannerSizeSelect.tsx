import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { BANNER_STYLES, BANNER_STYLE_LABEL } from '../copy';
import type { PodPromoBannerStyle } from '../queries';

/** '' is "the size in the settings", which the server uses when none is sent. */
export type SizeChoice = PodPromoBannerStyle | '';

const isSize = (value: string): value is PodPromoBannerStyle => BANNER_STYLES.some((size) => size === value);

interface Props {
  value: SizeChoice;
  onChange: (choice: SizeChoice) => void;
  disabled?: boolean;
}

/** Portrait (1080×1350) or square (1080×1080), or the settings' default. */
export default function BannerSizeSelect({ value, onChange, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      size="small"
      label={t('marketing.podPromo.bannerSize')}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(isSize(event.target.value) ? event.target.value : '')}
      sx={{ minWidth: 180 }}
      slotProps={{ htmlInput: { 'data-testid': 'banner-size-select' } }}
    >
      <MenuItem value="">{t('marketing.podPromo.sizeDefault')}</MenuItem>
      {BANNER_STYLES.map((size) => (
        <MenuItem key={size} value={size}>
          {t(BANNER_STYLE_LABEL[size])}
        </MenuItem>
      ))}
    </TextField>
  );
}
