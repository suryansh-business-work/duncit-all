import { z } from 'zod';
import type { DocumentNode } from '@apollo/client';
import { CONNECT_BRAND_RAZORPAY, CONNECT_BRAND_SHIPROCKET, type BrandIntegrationProvider, type BrandIntegrationStatus } from '../../queries';
import type { Translate } from '../wizard-steps';

export interface IntegrationFormValues {
  email: string;
  password: string;
  pickup_location: string;
  webhook_secret: string;
  key_id: string;
  key_secret: string;
}

export interface IntegrationFieldDef {
  name: keyof IntegrationFormValues;
  label: string;
  hint?: string;
  type?: 'email' | 'password' | 'text';
  required?: boolean;
  /** A secret the server keeps: blank leaves the saved one in place. */
  secret?: boolean;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** The inputs each provider's card shows — labels are literal keys for the localization gate. */
export const integrationFields = (t: Translate, provider: BrandIntegrationProvider): IntegrationFieldDef[] => {
  if (provider === 'SHIPROCKET') {
    return [
      { name: 'email', label: t('partners.brandWizard.integration.shiprocketEmail'), type: 'email', required: true },
      { name: 'password', label: t('partners.brandWizard.integration.shiprocketPassword'), type: 'password', secret: true },
      {
        name: 'pickup_location',
        label: t('partners.brandWizard.integration.shiprocketPickup'),
        hint: t('partners.brandWizard.integration.shiprocketPickupHint'),
      },
      {
        name: 'webhook_secret',
        label: t('partners.brandWizard.integration.shiprocketWebhook'),
        hint: t('partners.brandWizard.integration.shiprocketWebhookHint'),
        type: 'password',
        secret: true,
      },
    ];
  }
  return [
    {
      name: 'key_id',
      label: t('partners.brandWizard.integration.razorpayKeyId'),
      hint: t('partners.brandWizard.integration.razorpayKeyIdHint'),
      required: true,
    },
    { name: 'key_secret', label: t('partners.brandWizard.integration.razorpayKeySecret'), type: 'password', secret: true },
    { name: 'webhook_secret', label: t('partners.brandWizard.integration.razorpayWebhook'), type: 'password', secret: true },
  ];
};

export const integrationTitle = (t: Translate, provider: BrandIntegrationProvider) =>
  provider === 'SHIPROCKET' ? t('partners.brandWizard.integration.shiprocketTitle') : t('partners.brandWizard.integration.razorpayTitle');

export const integrationIntro = (t: Translate, provider: BrandIntegrationProvider) =>
  provider === 'SHIPROCKET' ? t('partners.brandWizard.integration.shiprocketIntro') : t('partners.brandWizard.integration.razorpayIntro');

/** What the form opens with: the public half the server holds, never a secret. */
export const integrationDefaults = (status: BrandIntegrationStatus | undefined): IntegrationFormValues => ({
  email: status?.provider === 'SHIPROCKET' ? status.identifier : '',
  password: '',
  pickup_location: status?.pickup_location ?? '',
  webhook_secret: '',
  key_id: status?.provider === 'RAZORPAY' ? status.identifier : '',
  key_secret: '',
});

/** Required halves per provider; a secret already on file may be left blank. */
export const makeIntegrationSchema = (t: Translate, provider: BrandIntegrationProvider, hasSecret: boolean) =>
  z
    .object({
      email: z.string().trim(),
      password: z.string(),
      pickup_location: z.string().trim(),
      webhook_secret: z.string(),
      key_id: z.string().trim(),
      key_secret: z.string(),
    })
    .superRefine((values, ctx) => {
      const required = t('partners.brandWizard.validation.required');
      const need = (path: keyof IntegrationFormValues, ok: boolean, message = required) => {
        if (!ok) ctx.addIssue({ code: 'custom', path: [path], message });
      };
      if (provider === 'SHIPROCKET') {
        need('email', values.email.length > 0);
        need('email', values.email.length === 0 || EMAIL_PATTERN.test(values.email), t('partners.brandWizard.validation.email'));
        need('password', hasSecret || values.password.length > 0);
        return;
      }
      need('key_id', values.key_id.length > 0);
      need('key_secret', hasSecret || values.key_secret.length > 0);
    });

const orUndefined = (value: string) => value || undefined;

/** The mutation input — a blank secret is omitted so the server keeps the saved one. */
export const toIntegrationInput = (provider: BrandIntegrationProvider, values: IntegrationFormValues) => {
  if (provider === 'SHIPROCKET') {
    return {
      email: values.email,
      password: orUndefined(values.password),
      pickup_location: values.pickup_location,
      webhook_secret: orUndefined(values.webhook_secret),
    };
  }
  return { key_id: values.key_id, key_secret: orUndefined(values.key_secret), webhook_secret: orUndefined(values.webhook_secret) };
};

export const CONNECT_DOCUMENT: Record<BrandIntegrationProvider, DocumentNode> = {
  SHIPROCKET: CONNECT_BRAND_SHIPROCKET,
  RAZORPAY: CONNECT_BRAND_RAZORPAY,
};

export const CONNECT_RESULT_KEY: Record<BrandIntegrationProvider, string> = {
  SHIPROCKET: 'connectBrandShiprocket',
  RAZORPAY: 'connectBrandRazorpay',
};
