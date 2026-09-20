import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import type { AutomationChannel } from '../../pages/automation/types';

/**
 * The contact a run is for — the test window and the Run-for-a-contact dialog
 * both collect one. A WhatsApp flow needs a number with its country code; an
 * email flow needs an address. The first message is what the contact "writes"
 * to start an inbound flow, and is blank for a Run-for-a-contact trigger.
 */
export const buildAutomationContactSchema = (t: Translate, channel: AutomationChannel) => {
  const base = {
    name: z.string().trim().min(1, t('ai.automation.test.contactNameRequired')).max(120),
    text: z.string().trim().max(4000).default(''),
    subject: z.string().trim().max(300).default(''),
    deliver: z.boolean().default(false),
  };
  if (channel === 'WHATSAPP') {
    return z.object({
      ...base,
      phone: z.string().trim().regex(/^\+?\d{10,15}$/, t('ai.automation.test.phoneInvalid')),
      email: z.string().default(''),
    });
  }
  return z.object({
    ...base,
    phone: z.string().default(''),
    email: z.string().trim().email(t('ai.automation.test.emailInvalid')),
  });
};

export interface AutomationContactFormValues {
  name: string;
  phone: string;
  email: string;
  text: string;
  subject: string;
  deliver: boolean;
}

export const automationContactInitialValues: AutomationContactFormValues = {
  name: '',
  phone: '',
  email: '',
  text: '',
  subject: '',
  deliver: false,
};

export interface AutomationContactFormProps {
  channel: AutomationChannel;
  /** Show the "Deliver for real" switch — the test window only. */
  showDeliver?: boolean;
  submitting?: boolean;
  submitLabel: string;
  /** Remembered between tests, so the tester types their number once. */
  initialValues?: Partial<AutomationContactFormValues>;
  onSubmit: (values: AutomationContactFormValues) => Promise<void> | void;
}
