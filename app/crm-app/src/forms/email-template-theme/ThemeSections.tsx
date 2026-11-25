import { useWatch, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { ChoiceField } from '@/components/ChoiceField';
import { useTranslation } from '@/hooks/useTranslation';
import { ColorField } from './ColorField';
import {
  EMAIL_THEME_COLOR_GROUPS,
  EMAIL_THEME_DARK_COLOR_FIELDS,
  EMAIL_THEME_FIELD_COPY,
  type EmailThemeValues,
} from './email-template-theme.types';
import { StepperField } from './StepperField';

type SectionProps = Readonly<{ control: Control<EmailThemeValues> }>;

/** Light-mode colours, grouped as a reader sees them: brand, text, surfaces. */
export function ThemeColorsSection({ control }: SectionProps) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3">
      {EMAIL_THEME_COLOR_GROUPS.map((group) => (
        <YStack key={group.titleKey} gap="$2">
          <Text color="$muted" fontSize="$2" fontWeight="700">
            {t(group.titleKey)}
          </Text>
          {group.fields.map((field) => {
            const { labelKey, hintKey } = EMAIL_THEME_FIELD_COPY[field];
            return (
              <ColorField
                key={field}
                control={control}
                name={field}
                label={t(labelKey)}
                hintKey={hintKey}
              />
            );
          })}
        </YStack>
      ))}
    </YStack>
  );
}

/** Heading and body fonts and the body text size. */
export function ThemeTypographySection({
  control,
  fonts,
}: Readonly<{
  control: Control<EmailThemeValues>;
  fonts: readonly { key: string; label: string }[];
}>) {
  const { t } = useTranslation();
  const options = fonts.map((font) => ({ value: font.key, label: font.label }));
  return (
    <YStack gap="$3">
      <ChoiceField
        control={control}
        name="heading_font"
        label={t(EMAIL_THEME_FIELD_COPY.heading_font.labelKey)}
        options={options}
        testID="theme-heading_font"
      />
      <ChoiceField
        control={control}
        name="body_font"
        label={t(EMAIL_THEME_FIELD_COPY.body_font.labelKey)}
        options={options}
        testID="theme-body_font"
      />
      <StepperField
        control={control}
        name="base_font_size"
        label={t(EMAIL_THEME_FIELD_COPY.base_font_size.labelKey)}
      />
    </YStack>
  );
}

const SHAPE_FIELDS = ['content_padding', 'button_radius', 'panel_radius'] as const;

/** The card's side padding and how round the buttons and panels are. */
export function ThemeShapeSection({ control }: SectionProps) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3">
      {SHAPE_FIELDS.map((field) => (
        <StepperField
          key={field}
          control={control}
          name={field}
          label={t(EMAIL_THEME_FIELD_COPY[field].labelKey)}
        />
      ))}
    </YStack>
  );
}

/** Light only, or follow the reader's mail app — and, when following it, the dark palette. */
export function ThemeDarkSection({ control }: SectionProps) {
  const { t } = useTranslation();
  const mode = useWatch({ control, name: 'color_mode' });
  return (
    <YStack gap="$3">
      <ChoiceField
        control={control}
        name="color_mode"
        label={t('crm.emailSettings.colorMode')}
        options={[
          { value: 'AUTO', label: t('crm.emailSettings.modeAuto') },
          { value: 'LIGHT', label: t('crm.emailSettings.modeLight') },
        ]}
        testID="theme-color_mode"
      />
      {mode === 'AUTO' ? (
        EMAIL_THEME_DARK_COLOR_FIELDS.map((field) => (
          <ColorField
            key={field}
            control={control}
            name={field}
            label={t(EMAIL_THEME_FIELD_COPY[field].labelKey)}
          />
        ))
      ) : (
        <Text color="$muted">{t('crm.emailSettings.lightOnlyNote')}</Text>
      )}
    </YStack>
  );
}
