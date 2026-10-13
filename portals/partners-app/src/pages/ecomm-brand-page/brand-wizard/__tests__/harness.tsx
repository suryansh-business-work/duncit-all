import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { BrandWizardRoute } from '../index';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../../__tests__/groupC-link';
import { brandRow } from '../../__tests__/brandRows';

type Over = Record<string, unknown>;

const integrationStatus = (provider: string, connected: boolean) => ({
  __typename: 'BrandIntegrationStatus',
  provider,
  configured: connected,
  connected,
  checked_at: null,
  message: '',
  details: [],
  identifier: '',
  has_secret: connected,
  pickup_location: '',
  live_mode: false,
  has_webhook_secret: false,
  sandbox: false,
  sandbox_identifier: '',
  has_sandbox_secret: false,
  sandbox_api_url: '',
  connection_id: null,
});

export const consent = (over: Over = {}) => ({
  __typename: 'BrandConsent',
  accepted: false,
  signed_name: '',
  signed_at: null,
  policy_slug: 'brand-partner-consent',
  policy_title: 'Brand Consent',
  content_hash: 'h1',
  current: false,
  available: true,
  ...over,
});

/** A brand as the wizard's MyEcommBrand document returns it. */
export const wizardBrand = (over: Over = {}) =>
  brandRow({
    shipping_mode: 'OWN_SHIPROCKET',
    integrations: {
      __typename: 'BrandIntegrations',
      shiprocket: integrationStatus('SHIPROCKET', false),
      razorpay: integrationStatus('RAZORPAY', false),
    },
    consent: consent(),
    completion: { __typename: 'BrandCompletion', percent: 0, next_step: 0, steps: [] },
    ...over,
  });

/** Every field a submission needs, in valid form, with the consent signed. */
export const completeBrand = (over: Over = {}) =>
  wizardBrand({
    brand_name: 'Aurora Pets',
    description: 'Treats and toys for happy dogs and cats.',
    logo_url: 'https://cdn.example.com/logo.png',
    registered_business_name: 'Aurora Pets LLP',
    gstin: '22AAAAA0000A1Z5',
    address_line1: '12 Industrial Area Phase 2',
    city: 'Pune',
    state: 'Maharashtra',
    postal_code: '411001',
    product_categories: ['Treats'],
    documents: [{ __typename: 'BrandDocument', type: 'GST', url: 'https://cdn.example.com/gst.pdf' }],
    consent: consent({ accepted: true, current: true, signed_name: 'Asha Verma', signed_at: '2026-07-01T10:00:00.000Z' }),
    ...over,
  });

export const policy = (over: Over = {}) => ({
  brandConsentPolicy: {
    __typename: 'BrandConsentPolicy',
    id: 'pol1',
    slug: 'brand-partner-consent',
    title: 'Brand Partner Consent',
    content: '<p>You agree to ship on time.</p>',
    is_active: true,
    updated_at: '2026-06-01T00:00:00.000Z',
    ...over,
  },
});

interface Mount {
  /** Route to open; the new-brand route by default. */
  route?: string;
  brand?: unknown;
  answers?: Record<string, ScriptedAnswer>;
  sent?: SentOperation[];
}

/** The wizard under both of its routes, so a first save can move from /new to /:id/edit. */
export function mountWizard({ route = '/ecomm-brand/new', brand, answers = {}, sent = [] }: Mount = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/ecomm-brand/new" element={<BrandWizardRoute />} />
      <Route path="/ecomm-brand/:brandId/edit" element={<BrandWizardRoute />} />
      <Route path="*" element={<p>elsewhere</p>} />
    </Routes>,
    {
      route,
      link: scriptedLink(
        {
          BrandWizardAccount: { me: { __typename: 'User', user_id: 'u1', email: 'asha@brand.example.com' } },
          MyEcommBrand: { myEcommBrand: brand ?? null },
          BrandConsentPolicy: policy(),
          MyPartnerIntegrations: { myPartnerIntegrations: [] },
          ...answers,
        },
        sent,
      ),
    },
  );
}

/** The real input inside a form field's test id. */
export const fieldInput = (testId: string) =>
  screen.getByTestId(testId).querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;

export const typeInto = (testId: string, value: string) => fireEvent.change(fieldInput(testId), { target: { value } });

export const where = () => screen.getByTestId('location').textContent;

export const EDIT = '/ecomm-brand/b1/edit';

/** The brand's two integrations, as the wizard's document returns them. */
export const integrationsOf = (shiprocket: boolean, razorpay: boolean, razorpayIdentifier = '') => ({
  __typename: 'BrandIntegrations',
  shiprocket: integrationStatus('SHIPROCKET', shiprocket),
  razorpay: { ...integrationStatus('RAZORPAY', razorpay), identifier: razorpayIdentifier },
});
