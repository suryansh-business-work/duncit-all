import { z } from 'zod';
import { EMAIL } from '@duncit/regex';
import type { BrandRazorpayInput, BrandShiprocketInput } from '@duncit/gql-types';
import type { BrandIntegrationProvider, BrandIntegrationStatus } from '../../queries';
import type { Translate } from '../wizard-steps';

export interface IntegrationFormValues {
  email: string;
  password: string;
  pickup_location: string;
  webhook_secret: string;
  key_id: string;
  key_secret: string;
  /** ShipRocket only: book test orders on the sandbox instead of real shipments. */
  sandbox: boolean;
  /** ShipRocket only: the sandbox API user and address, kept apart from the production ones above. */
  sandbox_email: string;
  sandbox_password: string;
  sandbox_api_url: string;
}

export interface IntegrationFieldDef {
  name: Exclude<keyof IntegrationFormValues, 'sandbox'>;
  label: string;
  hint?: string;
  type?: 'email' | 'password' | 'text';
  required?: boolean;
  /** A secret the server keeps: blank leaves the saved one in place. */
  secret?: boolean;
}

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

/** The ShipRocket sandbox's own inputs, shown once sandbox mode is on: address, then the sandbox API user. */
export const sandboxFields = (t: Translate, standardUrl: string): IntegrationFieldDef[] => [
  {
    name: 'sandbox_api_url',
    label: t('partners.brandWizard.integration.sandboxUrl'),
    hint: t('partners.brandWizard.integration.sandboxUrlHint', { vars: { url: standardUrl } }),
  },
  { name: 'sandbox_email', label: t('partners.brandWizard.integration.sandboxEmail'), type: 'email', required: true },
  { name: 'sandbox_password', label: t('partners.brandWizard.integration.sandboxPassword'), type: 'password', secret: true },
];

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
  sandbox: status?.provider === 'SHIPROCKET' && status.sandbox === true,
  sandbox_email: status?.sandbox_identifier ?? '',
  sandbox_password: '',
  sandbox_api_url: status?.sandbox_api_url ?? '',
});

/** A full https address. Whether it is ShipRocket's is the server's call, which answers with the reason. */
const isHttpsUrl = (value: string) => URL.canParse(value) && new URL(value).protocol === 'https:';

/**
 * Required halves per provider; a secret already on file may be left blank.
 * ShipRocket in sandbox mode needs its sandbox API user instead of the
 * production one, which is kept as it is and not checked.
 */
export const makeIntegrationSchema = (
  t: Translate,
  provider: BrandIntegrationProvider,
  hasSecret: boolean,
  hasSandboxSecret = false,
) =>
  z
    .object({
      email: z.string().trim(),
      password: z.string(),
      pickup_location: z.string().trim(),
      webhook_secret: z.string(),
      key_id: z.string().trim(),
      key_secret: z.string(),
      sandbox: z.boolean(),
      sandbox_email: z.string().trim(),
      sandbox_password: z.string(),
      sandbox_api_url: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      const required = t('partners.brandWizard.validation.required');
      const need = (path: keyof IntegrationFormValues, ok: boolean, message = required) => {
        if (!ok) ctx.addIssue({ code: 'custom', path: [path], message });
      };
      if (provider === 'SHIPROCKET') {
        const emailPath = values.sandbox ? 'sandbox_email' : 'email';
        const email = values[emailPath];
        need(emailPath, email.length > 0);
        need(emailPath, email.length === 0 || EMAIL.test(email), t('partners.brandWizard.validation.email'));
        if (!values.sandbox) {
          need('password', hasSecret || values.password.length > 0);
          return;
        }
        need('sandbox_password', hasSandboxSecret || values.sandbox_password.length > 0);
        need(
          'sandbox_api_url',
          values.sandbox_api_url.length === 0 || isHttpsUrl(values.sandbox_api_url),
          t('partners.brandWizard.integration.sandboxUrlInvalid'),
        );
        return;
      }
      need('key_id', values.key_id.length > 0);
      need('key_secret', hasSecret || values.key_secret.length > 0);
    });

const orUndefined = (value: string) => value || undefined;

/** The ShipRocket input — a blank secret is omitted so the server keeps the saved one; a blank sandbox address clears it. */
export const toShiprocketInput = (values: IntegrationFormValues): BrandShiprocketInput => ({
  email: values.email,
  password: orUndefined(values.password),
  pickup_location: values.pickup_location,
  webhook_secret: orUndefined(values.webhook_secret),
  sandbox: values.sandbox,
  sandbox_email: values.sandbox_email,
  sandbox_password: orUndefined(values.sandbox_password),
  sandbox_api_url: values.sandbox_api_url,
});

/** The Razorpay input — a blank secret is omitted so the server keeps the saved one. */
export const toRazorpayInput = (values: IntegrationFormValues): BrandRazorpayInput => ({
  key_id: values.key_id,
  key_secret: orUndefined(values.key_secret),
  webhook_secret: orUndefined(values.webhook_secret),
});
