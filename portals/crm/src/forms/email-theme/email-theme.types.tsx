import type { useTranslation } from '@duncit/shell';
import type { CrmEmailFontOption, CrmEmailTheme } from '../../api/emailSettings.gql';
import type { EmailThemeFormValues } from './email-theme.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface EmailThemeFormProps {
  /** The saved theme the form starts from. */
  initialValues: CrmEmailTheme;
  /** The shared design tokens — what "Reset to Duncit defaults" restores. */
  defaults: CrmEmailTheme;
  fonts: CrmEmailFontOption[];
  submitting?: boolean;
  onSubmit: (values: EmailThemeFormValues) => void;
  /** Every valid change, for the live preview beside the form. */
  onPreview?: (values: EmailThemeFormValues) => void;
}

export type { EmailThemeFormValues };
