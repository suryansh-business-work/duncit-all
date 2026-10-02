import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from './i18n/useTranslation';
import type { Orientation } from './types';

interface Props {
  value: Orientation;
  onChange: (orientation: Orientation) => void;
  sx?: SxProps<Theme>;
}

/** The All / landscape / portrait / square switch both Pexels tabs search by. */
export default function PexelsOrientationToggle({ value, onChange, sx }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_e, v) => onChange(v ?? '')}
      sx={sx}
    >
      <ToggleButton value="">All</ToggleButton>
      <ToggleButton value="landscape">{t('media.pexels.landscape')}</ToggleButton>
      <ToggleButton value="portrait">{t('media.pexels.portrait')}</ToggleButton>
      <ToggleButton value="square">{t('media.pexels.square')}</ToggleButton>
    </ToggleButtonGroup>
  );
}
