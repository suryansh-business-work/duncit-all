import type { MaterialIcons } from '@expo/vector-icons';
import type { EmailTemplateTarget } from '@duncit/forms/schemas';

type Translate = (key: string) => string;

/** The audience chip on a template row (literal keys for the localization gate). */
const CHIP_KEYS: Record<string, string> = {
  VENUE: 'crm.common.venue',
  HOST: 'crm.common.host',
  ECOMM: 'crm.common.ecomm',
  STATIC: 'crm.emailTemplates.static',
};

/** A template's audience in words; an audience this app does not know yet shows as sent. */
export const targetLabel = (t: Translate, target: string): string => {
  const key = CHIP_KEYS[target];
  return key ? t(key) : target;
};

/** The audience cards a new template starts from, as the portal's create dialog offers them. */
export const TARGET_CHOICES: readonly {
  value: EmailTemplateTarget;
  labelKey: string;
  hintKey: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  {
    value: 'VENUE',
    labelKey: 'crm.emailTemplates.venueLeadEmails',
    hintKey: 'crm.emailTemplates.venueHint',
    icon: 'storefront',
  },
  {
    value: 'HOST',
    labelKey: 'crm.emailTemplates.hostLeadEmails',
    hintKey: 'crm.emailTemplates.hostHint',
    icon: 'groups',
  },
  {
    value: 'ECOMM',
    labelKey: 'crm.emailTemplates.ecommLeadEmails',
    hintKey: 'crm.emailTemplates.ecommHint',
    icon: 'storefront',
  },
  {
    value: 'STATIC',
    labelKey: 'crm.emailTemplates.staticNoVariables',
    hintKey: 'crm.emailTemplates.staticHint',
    icon: 'description',
  },
];
