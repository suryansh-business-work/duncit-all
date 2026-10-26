import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ConsentStep from './steps/ConsentStep';
import IntegrationGuide from './steps/IntegrationGuide';
import { IntegrationResult } from './steps/IntegrationStatus';
import { integrationDefaults } from './steps/integration-forms';
import { reviewSections } from './steps/review-sections';
import { blankBrand } from '../schema';
import type { BrandIntegrationStatus } from '../queries';
import { EDIT, completeBrand, consent, fieldInput, integrationsOf, mountWizard, policy, wizardBrand } from './__tests__/harness';
import { integrationStatus } from '../integrations/__tests__/harness';
import { renderWithProviders } from '../../../__tests__/render';
import { recordNotices } from '../../../__tests__/groupC-notices';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  globalThis.localStorage.clear();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  vi.unstubAllGlobals();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const open = (step: string, brand: unknown, answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  mountWizard({ route: `${EDIT}?step=${step}`, brand, answers, sent });

describe('the wizard page title', () => {
  it('calls an unnamed draft Edit brand', async () => {
    mountWizard({ route: EDIT, brand: wizardBrand({ brand_name: '' }) });
    expect(await screen.findByRole('heading', { name: 'Edit brand', level: 1 })).toBeTruthy();
  });

  it('calls an unnamed brand under review Brand details', async () => {
    mountWizard({ route: EDIT, brand: wizardBrand({ brand_name: '', status: 'SUBMITTED' }) });
    expect(await screen.findByRole('heading', { name: 'Brand details', level: 1 })).toBeTruthy();
  });

  it('opens on the first step when the brand carries no progress', async () => {
    mountWizard({ route: EDIT, brand: wizardBrand({ completion: null }) });
    expect(await screen.findByTestId('brand-wizard-brand-name')).toBeTruthy();
  });

  it('shows a rejection that carries no notes without a dangling note', async () => {
    mountWizard({ route: EDIT, brand: wizardBrand({ status: 'REJECTED', reviewer_notes: null }) });
    expect((await screen.findByTestId('brand-wizard-rejected')).textContent).toMatch(/^Rejected:\s+Update the brand/);
  });
});

describe('the brand danger zone', () => {
  it('pauses an approved brand after a confirmation, says so and reloads the brand', async () => {
    const sent: SentOperation[] = [];
    mountWizard({
      route: EDIT,
      brand: wizardBrand({ status: 'APPROVED', is_active: true }),
      sent,
      answers: { SetMyEcommBrandActive: { setMyEcommBrandActive: { __typename: 'EcommBrand', id: 'b1', is_active: false } } },
    });
    fireEvent.click(await screen.findByTestId('brand-danger-pause'));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Temporarily deactivate brand')).toBeTruthy();
    const loads = sent.filter((op) => op.name === 'MyEcommBrand').length;
    fireEvent.click(dialog.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(messages()).toContain('Brand visibility updated.'));
    expect(sent.find((op) => op.name === 'SetMyEcommBrandActive')?.variables).toEqual({ brand_doc_id: 'b1', active: false });
    await waitFor(() => expect(sent.filter((op) => op.name === 'MyEcommBrand').length).toBeGreaterThan(loads));
  });
});

describe('submitting when the draft cannot be saved first', () => {
  it('says why and never submits', async () => {
    const sent: SentOperation[] = [];
    open('review', completeBrand(), { SaveEcommBrand: new Error('Brand name already taken') }, sent);
    const submit = await screen.findByTestId('brand-wizard-submit');
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(submit);
    await waitFor(() => expect(messages()).toContain('Brand name already taken'));
    expect(sent.some((op) => op.name === 'SubmitEcommBrand')).toBe(false);
  });
});

describe('steps that depend on the brand’s state', () => {
  it('lists the brand’s categories without a way to remove one once the brand is locked', async () => {
    open('categories', wizardBrand({ status: 'SUBMITTED', product_categories: ['Treats'] }));
    const list = within(await screen.findByTestId('brand-wizard-category-list'));
    expect(list.getByText('Treats')).toBeTruthy();
    expect(screen.queryByTestId('CancelIcon')).toBeNull();
  });

  it('renames one document without touching the others', async () => {
    open(
      'documents',
      wizardBrand({
        documents: [
          { __typename: 'BrandDocument', type: 'GST', url: 'https://cdn.example.com/gst.pdf' },
          { __typename: 'BrandDocument', type: 'PAN', url: 'https://cdn.example.com/pan.pdf' },
        ],
      }),
    );
    const list = await screen.findByTestId('brand-wizard-document-list');
    const [first, second] = within(list).getAllByLabelText(/Document type/i) as HTMLInputElement[];
    fireEvent.change(first, { target: { value: 'GST certificate' } });
    await waitFor(() => expect(first.value).toBe('GST certificate'));
    expect(second.value).toBe('PAN');
  });

  it('tells a brand with both integrations connected that shipping and payments are settled', async () => {
    open('review', wizardBrand({ integrations: integrationsOf(true, true) }));
    const alert = await screen.findByTestId('brand-review-integrations');
    expect(alert.textContent).toBe('Shipping is settled and Razorpay is connected.');
  });

  it('says the integrations could not be loaded and still shows the two pickers', async () => {
    open('integration', wizardBrand(), { MyPartnerIntegrations: new Error('Integrations are down') });
    expect(await screen.findByText(/Could not load your integrations\. Integrations are down/)).toBeTruthy();
  });
});

describe('ConsentStep before the brand has an id', () => {
  const mount = (ensure: () => Promise<string | null>, answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) => {
    const onChanged = vi.fn();
    renderWithProviders(
      <ConsentStep brandId={null} consent={undefined} locked={false} ensureBrandId={ensure} onChanged={onChanged} />,
      {
        link: scriptedLink(
          {
            BrandConsentPolicy: policy({ content: null }),
            SignBrandConsent: { signBrandConsent: consent({ accepted: true, current: true, signed_name: 'Asha Verma' }) },
            ...answers,
          },
          sent,
        ),
      },
    );
    return onChanged;
  };
  const sign = async (name = 'Asha Verma') => {
    await screen.findByTestId('brand-consent-policy');
    fireEvent.click(within(screen.getByTestId('brand-consent-accept')).getByRole('checkbox'));
    fireEvent.change(fieldInput('brand-consent-signed-name'), { target: { value: name } });
    fireEvent.click(screen.getByTestId('brand-consent-sign'));
  };

  it('shows an empty policy body when the policy carries no text, with the name field empty', async () => {
    mount(async () => 'b9');
    expect((await screen.findByTestId('brand-consent-policy')).innerHTML).toBe('');
    expect(fieldInput('brand-consent-signed-name').value).toBe('');
  });

  it('saves the brand first to get an id, then signs against it', async () => {
    const sent: SentOperation[] = [];
    const onChanged = mount(async () => 'b9', {}, sent);
    await sign();
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'SignBrandConsent')?.variables).toEqual({ brand_doc_id: 'b9', signed_name: 'Asha Verma' });
    expect(messages()).toContain('Consent signed.');
  });

  it('signs nothing when the brand could not be saved first', async () => {
    const sent: SentOperation[] = [];
    const onChanged = mount(async () => null, {}, sent);
    await sign();
    await waitFor(() => expect(screen.getByTestId('brand-consent-sign')).toBeTruthy());
    expect(sent.some((op) => op.name === 'SignBrandConsent')).toBe(false);
    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe('IntegrationGuide copy button', () => {
  it('reports a clipboard refusal that is not an Error in the generic words', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue('denied') } });
    renderWithProviders(<IntegrationGuide provider="SHIPROCKET" defaultExpanded />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(messages()).toContain('Something went wrong. Please try again.'));
  });
});

describe('IntegrationResult', () => {
  const result = (over: Record<string, unknown>) =>
    integrationStatus('RAZORPAY', over) as unknown as BrandIntegrationStatus;

  it('shows a passed check as a success with its detail lines', () => {
    renderWithProviders(<IntegrationResult result={result({ connected: true, message: 'Keys verified', details: ['Live mode'] })} />);
    const alert = screen.getByTestId('integration-result');
    expect(alert.className).toContain('MuiAlert-colorSuccess');
    expect(alert.textContent).toContain('Keys verified');
    expect(alert.textContent).toContain('Live mode');
  });

  it('shows a failed check as an error', () => {
    renderWithProviders(<IntegrationResult result={result({ connected: false, message: 'Key revoked', details: [] })} />);
    expect(screen.getByTestId('integration-result').className).toContain('MuiAlert-colorError');
  });
});

describe('integrationDefaults', () => {
  it('opens a saved ShipRocket account on its email, pickup nickname and sandbox settings', () => {
    const status = integrationStatus('SHIPROCKET', {
      identifier: 'ops@brand.example.com',
      pickup_location: 'Primary',
      sandbox: true,
      sandbox_identifier: 'sandbox@brand.example.com',
      sandbox_api_url: 'https://sandbox.example.com',
    }) as unknown as BrandIntegrationStatus;
    expect(integrationDefaults(status)).toMatchObject({
      email: 'ops@brand.example.com',
      key_id: '',
      pickup_location: 'Primary',
      sandbox: true,
      sandbox_email: 'sandbox@brand.example.com',
      sandbox_api_url: 'https://sandbox.example.com',
    });
  });

  it('opens a saved Razorpay account on its key id, never a secret', () => {
    const status = integrationStatus('RAZORPAY', { identifier: 'rzp_test_main' }) as unknown as BrandIntegrationStatus;
    expect(integrationDefaults(status)).toMatchObject({ key_id: 'rzp_test_main', email: '', sandbox: false, key_secret: '', password: '' });
  });

  it('opens a new connection empty', () => {
    expect(integrationDefaults(undefined)).toMatchObject({ email: '', key_id: '', pickup_location: '', sandbox: false });
  });
});

describe('reviewSections', () => {
  const t = (key: string) => key;
  const valueOf = (key: string, label: string, values = blankBrand) =>
    reviewSections(t, values)
      .find((section) => section.key === key)
      ?.rows.find((row) => row.label === label)?.value;

  it('says Yes for a logo and a cover image that are set, and nothing for ones that are not', () => {
    expect(valueOf('media', 'partners.ecommBrandPage.logo')).toBe('');
    expect(valueOf('media', 'partners.ecommBrandPage.coverImage')).toBe('');
    const withMedia = { ...blankBrand, logo_url: 'https://cdn.example.com/l.png', cover_image_url: 'https://cdn.example.com/c.png' };
    expect(valueOf('media', 'partners.ecommBrandPage.logo', withMedia)).toBe('shell.common.yes');
    expect(valueOf('media', 'partners.ecommBrandPage.coverImage', withMedia)).toBe('shell.common.yes');
  });
});
