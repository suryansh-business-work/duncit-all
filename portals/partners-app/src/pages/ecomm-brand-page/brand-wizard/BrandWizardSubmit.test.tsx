import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { EDIT, completeBrand, consent, fieldInput, mountWizard, wizardBrand } from './__tests__/harness';
import { recordNotices } from '../../../__tests__/groupC-notices';
import type { ScriptedAnswer, SentOperation } from '../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

const open = (step: string, brand: unknown, answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  mountWizard({ route: `${EDIT}?step=${step}`, brand, answers, sent });

describe('review step', () => {
  it('lists what still blocks submission and keeps Submit off', async () => {
    open('review', wizardBrand({ brand_name: 'Aurora Pets', account_number: '123456789012' }));
    const blocked = within(await screen.findByTestId('brand-review-blocked'));
    expect(blocked.getByText('Business & legal')).toBeTruthy();
    expect(blocked.getByText('Final consent')).toBeTruthy();
    expect(screen.getByTestId('brand-review-integrations').textContent).toContain('Not needed to submit');
    // The account number is masked down to its last four digits.
    expect(screen.getByText('••••9012')).toBeTruthy();
    expect((screen.getByTestId('brand-wizard-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('jumps to a section from its Edit button', async () => {
    open('review', wizardBrand());
    fireEvent.click(await screen.findByTestId('brand-review-edit-address'));
    expect(await screen.findByTestId('brand-wizard-address-line1')).toBeTruthy();
  });

  it('has no Edit buttons once the brand is locked', async () => {
    open('review', wizardBrand({ status: 'SUBMITTED' }));
    await screen.findByTestId('brand-review-integrations');
    expect(screen.queryByTestId('brand-review-edit-address')).toBeNull();
  });

  it('has nothing blocking a complete brand and tells it what integrations do', async () => {
    open('review', completeBrand());
    await screen.findByTestId('brand-review-integrations');
    expect(screen.queryByTestId('brand-review-blocked')).toBeNull();
    await waitFor(() => expect((screen.getByTestId('brand-wizard-submit') as HTMLButtonElement).disabled).toBe(false));
  });
});

describe('submitting for review', () => {
  it('saves the brand, submits it and moves on to the last step', async () => {
    const sent: SentOperation[] = [];
    open(
      'review',
      completeBrand(),
      {
        SaveEcommBrand: { saveEcommBrand: completeBrand() },
        SubmitEcommBrand: { submitEcommBrand: { __typename: 'EcommBrand', id: 'b1', status: 'SUBMITTED', submitted_at: '2026-07-02T10:00:00.000Z' } },
      },
      sent,
    );
    const submit = await screen.findByTestId('brand-wizard-submit');
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(submit);

    await waitFor(() => expect(messages()).toContain('Brand submitted for review. Our team verifies every detail before it goes live.'));
    const names = sent.map((op) => op.name);
    expect(names.indexOf('SaveEcommBrand')).toBeLessThan(names.indexOf('SubmitEcommBrand'));
    expect(sent.find((op) => op.name === 'SubmitEcommBrand')?.variables).toEqual({ brand_doc_id: 'b1' });
    // The wizard lands on Integration, the last step, which finishes with "Go to brand".
    expect(await screen.findByTestId('brand-wizard-finish')).toBeTruthy();
  });

  it('refuses to submit a form with a malformed field and points at the step', async () => {
    const sent: SentOperation[] = [];
    open('review', completeBrand({ website_url: 'ftp://nope' }), {}, sent);
    const submit = await screen.findByTestId('brand-wizard-submit');
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(submit);
    await waitFor(() => expect(messages()).toContain('Some steps need fixing — they are marked in the list.'));
    expect(sent.some((op) => op.name === 'SubmitEcommBrand')).toBe(false);
    await waitFor(() =>
      expect(screen.getByTestId('brand-wizard-step-errors-details').textContent).toContain('Enter a valid link'),
    );
  });

  it('reports a submission the server refuses and stays put', async () => {
    open('review', completeBrand(), {
      SaveEcommBrand: { saveEcommBrand: completeBrand() },
      SubmitEcommBrand: new Error('Logo is missing'),
    });
    const submit = await screen.findByTestId('brand-wizard-submit');
    await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(submit);
    await waitFor(() => expect(messages()).toContain('Logo is missing'));
    expect(screen.queryByTestId('brand-wizard-finish')).toBeNull();
  });
});

describe('consent step', () => {
  it('shows the policy and will not sign without the tick and a name', async () => {
    const sent: SentOperation[] = [];
    open('consent', wizardBrand(), {}, sent);
    expect((await screen.findByTestId('brand-consent-policy')).textContent).toContain('You agree to ship on time.');
    expect(screen.getByText('Brand Partner Consent')).toBeTruthy();
    fireEvent.click(screen.getByTestId('brand-consent-sign'));
    await waitFor(() => expect(screen.getAllByText('This field is required.').length).toBeGreaterThan(0));
    expect(sent.some((op) => op.name === 'SignBrandConsent')).toBe(false);
  });

  it('signs with the typed name and reloads the brand', async () => {
    const sent: SentOperation[] = [];
    open('consent', wizardBrand(), { SignBrandConsent: { signBrandConsent: consent({ accepted: true, current: true, signed_name: 'Asha Verma' }) } }, sent);
    await screen.findByTestId('brand-consent-policy');
    fireEvent.click(within(screen.getByTestId('brand-consent-accept')).getByRole('checkbox'));
    fireEvent.change(fieldInput('brand-consent-signed-name'), { target: { value: 'Asha Verma' } });
    fireEvent.click(screen.getByTestId('brand-consent-sign'));

    await waitFor(() => expect(messages()).toContain('Consent signed.'));
    expect(sent.find((op) => op.name === 'SignBrandConsent')?.variables).toEqual({ brand_doc_id: 'b1', signed_name: 'Asha Verma' });
  });

  it('reports a refused signature', async () => {
    open('consent', wizardBrand(), { SignBrandConsent: new Error('Policy changed') });
    await screen.findByTestId('brand-consent-policy');
    fireEvent.click(within(screen.getByTestId('brand-consent-accept')).getByRole('checkbox'));
    fireEvent.change(fieldInput('brand-consent-signed-name'), { target: { value: 'Asha Verma' } });
    fireEvent.click(screen.getByTestId('brand-consent-sign'));
    await waitFor(() => expect(messages()).toContain('Policy changed'));
  });

  it('shows a signed consent and hides the form', async () => {
    open('consent', completeBrand());
    expect((await screen.findByTestId('brand-consent-signed')).textContent).toContain('Signed by Asha Verma');
    expect(screen.queryByTestId('brand-consent-sign')).toBeNull();
  });

  it('asks to sign again when the wording changed', async () => {
    open('consent', wizardBrand({ consent: consent({ accepted: true, current: false, signed_name: 'Asha Verma' }) }));
    expect(await screen.findByText('The consent wording changed since you signed. Read and sign it again.')).toBeTruthy();
    expect(screen.getByTestId('brand-consent-sign')).toBeTruthy();
  });

  it('says so when Legal has published no consent', async () => {
    open('consent', wizardBrand(), { BrandConsentPolicy: { brandConsentPolicy: null } });
    expect(await screen.findByText(/Legal has not published a Brand Consent yet/)).toBeTruthy();
  });
});
