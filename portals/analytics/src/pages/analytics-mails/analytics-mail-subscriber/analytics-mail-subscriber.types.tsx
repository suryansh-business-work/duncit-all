import { z } from 'zod';
import type { AnalyticsEntity, AnalyticsMailSubscriptionInput } from '@duncit/gql-types';
import { ANALYTICS_PAGES } from '../../entity-analytics/pages';
import type { AnalyticsMailSubscription } from '../queries';

export const FREQUENCIES = ['DAILY', 'WEEKLY'] as const;

export interface SubscriberMessages {
  nameRequired: string;
  nameTooLong: string;
  emailFormat: string;
  pagesRequired: string;
}

export const subscriberSchema = (messages: SubscriberMessages) =>
  z.object({
    name: z.string().trim().min(1, messages.nameRequired).max(120, messages.nameTooLong),
    email: z.string().trim().email(messages.emailFormat).max(254, messages.emailFormat),
    pages: z.array(z.custom<AnalyticsEntity>((value) => typeof value === 'string')).min(1, messages.pagesRequired),
    frequency: z.enum(FREQUENCIES),
    days: z.number().int(),
    is_active: z.boolean(),
  });

export type SubscriberValues = z.infer<ReturnType<typeof subscriberSchema>>;

/** Every dashboard, weekly, the last 7 days — the report most people want. */
export const emptySubscriber = (): SubscriberValues => ({
  name: '',
  email: '',
  pages: ANALYTICS_PAGES.map((page) => page.entity),
  frequency: 'WEEKLY',
  days: 7,
  is_active: true,
});

export const toSubscriberValues = (sub: AnalyticsMailSubscription): SubscriberValues => ({
  name: sub.name,
  email: sub.email,
  pages: sub.pages,
  frequency: sub.frequency,
  days: sub.days,
  is_active: sub.is_active,
});

export const toSubscriptionInput = (values: SubscriberValues): AnalyticsMailSubscriptionInput => ({
  ...values,
  name: values.name.trim(),
  email: values.email.trim().toLowerCase(),
});
