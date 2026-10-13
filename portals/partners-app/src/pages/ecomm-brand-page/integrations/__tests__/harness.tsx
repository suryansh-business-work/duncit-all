import type { ReactElement } from 'react';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../../__tests__/groupC-link';

type Over = Record<string, unknown>;

/** One vendor-check result the way the integration documents select it. */
export const integrationStatus = (provider: string, over: Over = {}) => ({
  __typename: 'BrandIntegrationStatus',
  provider,
  configured: true,
  connected: true,
  checked_at: null,
  message: '',
  details: [],
  identifier: provider === 'RAZORPAY' ? 'rzp_test_main' : 'ops@brand.example.com',
  has_secret: true,
  pickup_location: provider === 'SHIPROCKET' ? 'Primary' : '',
  live_mode: false,
  has_webhook_secret: false,
  sandbox: false,
  sandbox_identifier: '',
  has_sandbox_secret: false,
  sandbox_api_url: '',
  connection_id: null,
  ...over,
});

/** A saved connection of the partner. `over` goes onto the status unless it names `brands`. */
export const connection = (id: string, provider: 'RAZORPAY' | 'SHIPROCKET', label: string, over: Over = {}) => {
  const { brands = [], ...status } = over;
  return {
    __typename: 'PartnerIntegration',
    id,
    provider,
    label,
    status: integrationStatus(provider, status),
    brands,
  };
};

/** Mounts a tree under the portal providers with the named operations answered. */
export function mountIntegrations(ui: ReactElement, answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) {
  return renderWithProviders(ui, { route: '/ecomm-brand/integrations', link: scriptedLink(answers, sent) });
}
