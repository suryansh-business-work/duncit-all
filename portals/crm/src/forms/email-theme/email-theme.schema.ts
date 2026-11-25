/**
 * The CRM email theme rules, shared with the Duncit CRM app through
 * @duncit/forms/schemas so both refuse the same theme with the same sentence.
 */
export {
  EMAIL_THEME_RANGES,
  EMAIL_THEME_LIGHT_COLOR_FIELDS as LIGHT_COLOR_FIELDS,
  EMAIL_THEME_DARK_COLOR_FIELDS as DARK_COLOR_FIELDS,
  makeEmailThemeSchema as emailThemeSchema,
  emailThemeToValues as themeToForm,
  type EmailThemeValues as EmailThemeFormValues,
} from '@duncit/forms/schemas';
