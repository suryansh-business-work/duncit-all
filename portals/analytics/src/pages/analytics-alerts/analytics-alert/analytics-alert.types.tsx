import { z } from 'zod';
import type { AnalyticsAlertInput, AnalyticsEntity } from '@duncit/gql-types';
import { ANALYTICS_PAGES } from '../../entity-analytics/pages';
import type { AnalyticsAlert, AnalyticsAlertCondition } from '../queries';

export const CONDITIONS = ['ABOVE', 'BELOW', 'RISES_BY', 'FALLS_BY'] as const;

/** The conditions that read the tile's change against the period before, in %. */
export const CHANGE_CONDITIONS: ReadonlySet<AnalyticsAlertCondition> = new Set<AnalyticsAlertCondition>([
  'RISES_BY',
  'FALLS_BY',
]);

/** The most people one alert mails — the server holds the same line. */
export const MAX_RECIPIENTS = 20;

export interface AlertMessages {
  nameRequired: string;
  nameTooLong: string;
  tileRequired: string;
  thresholdRequired: string;
  thresholdInvalid: string;
  thresholdPositive: string;
  emailFormat: string;
  tooManyRecipients: string;
  recipientsRequired: string;
}

const isNumber = (value: string) => Number.isFinite(Number(value));

export const alertSchema = (messages: AlertMessages) =>
  z
    .object({
      name: z.string().trim().min(1, messages.nameRequired).max(120, messages.nameTooLong),
      entity: z.custom<AnalyticsEntity>((value) => typeof value === 'string' && value.length > 0),
      kpi_key: z.string().min(1, messages.tileRequired),
      condition: z.enum(CONDITIONS),
      threshold: z.string().trim().min(1, messages.thresholdRequired).refine(isNumber, messages.thresholdInvalid),
      days: z.number().int(),
      emails: z.array(z.string().trim().email(messages.emailFormat)).max(MAX_RECIPIENTS, messages.tooManyRecipients),
      slack: z.boolean(),
      is_active: z.boolean(),
    })
    .refine((values) => !CHANGE_CONDITIONS.has(values.condition) || Number(values.threshold) > 0, {
      message: messages.thresholdPositive,
      path: ['threshold'],
    })
    .refine((values) => values.emails.length > 0 || values.slack, {
      message: messages.recipientsRequired,
      path: ['emails'],
    });

export type AlertValues = z.infer<ReturnType<typeof alertSchema>>;

/** A new alert: the first dashboard, a week's numbers, mailing nobody until someone is added. */
export const emptyAlert = (): AlertValues => ({
  name: '',
  entity: ANALYTICS_PAGES[0].entity,
  kpi_key: '',
  condition: 'ABOVE',
  threshold: '',
  days: 7,
  emails: [],
  slack: false,
  is_active: true,
});

export const toAlertValues = (alert: AnalyticsAlert): AlertValues => ({
  name: alert.name,
  entity: alert.entity,
  kpi_key: alert.kpi_key,
  condition: alert.condition,
  threshold: String(alert.threshold),
  days: alert.days,
  emails: alert.emails,
  slack: alert.slack,
  is_active: alert.is_active,
});

export const toAlertInput = (values: AlertValues): AnalyticsAlertInput => ({
  ...values,
  name: values.name.trim(),
  threshold: Number(values.threshold.trim()),
  emails: values.emails.map((email) => email.trim().toLowerCase()),
});
