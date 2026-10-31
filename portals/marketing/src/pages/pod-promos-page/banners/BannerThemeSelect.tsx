import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { BANNER_THEMES, BANNER_THEME_LABEL } from '../copy';
import type { PodBannerStyle } from '../queries';

/** '' is "let the pod's category decide", which the server does when no style is sent. */
export type ThemeChoice = PodBannerStyle | '';

const isTheme = (value: string): value is PodBannerStyle => BANNER_THEMES.some((theme) => theme === value);

/** The value a mutation takes: the chosen look, or null for the category's own. */
export const themeVariable = (choice: ThemeChoice): PodBannerStyle | null => choice || null;

interface Props {
  value: ThemeChoice;
  onChange: (choice: ThemeChoice) => void;
  disabled?: boolean;
  testId: string;
}

/** The banner look: one of the five families, or automatic from the pod's category. */
export default function BannerThemeSelect({ value, onChange, disabled, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      size="small"
      label={t('marketing.podPromo.bannerTheme')}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(isTheme(event.target.value) ? event.target.value : '')}
      sx={{ minWidth: 200 }}
      slotProps={{ htmlInput: { 'data-testid': testId } }}
    >
      <MenuItem value="">{t('marketing.podPromo.themeAuto')}</MenuItem>
      {BANNER_THEMES.map((theme) => (
        <MenuItem key={theme} value={theme}>
          {t(BANNER_THEME_LABEL[theme])}
        </MenuItem>
      ))}
    </TextField>
  );
}
