import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/** New flow: a name, and a line for the list. The graph starts as one trigger. */
export const buildAutomationFlowSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t('ai.automation.form.nameRequired')).max(80, t('ai.automation.form.nameMax')),
    description: z.string().trim().max(300, t('ai.automation.form.descriptionMax')).default(''),
  });

export interface AutomationFlowFormValues {
  name: string;
  description: string;
}

export const automationFlowInitialValues: AutomationFlowFormValues = { name: '', description: '' };

export interface AutomationFlowFormProps {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: AutomationFlowFormValues) => Promise<void> | void;
}
