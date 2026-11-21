import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { THEME_FIELD_COPY } from '../themeFieldCopy';
import { EMAIL_THEME_RANGES } from '../email-theme.schema';
import SliderField from './SliderField';

const FIELDS = ['content_padding', 'button_radius', 'panel_radius'] as const;

/** The card's side padding and how round the buttons and panels are. */
export default function ThemeShapeSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      {FIELDS.map((field) => (
        <SliderField key={field} name={field} label={t(THEME_FIELD_COPY[field].labelKey)} {...EMAIL_THEME_RANGES[field]} />
      ))}
    </Stack>
  );
}
