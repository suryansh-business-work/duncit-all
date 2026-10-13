import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { EDIT, fieldInput, mountWizard, typeInto, where, wizardBrand } from './__tests__/harness';
import { recordNotices } from '../../../__tests__/groupC-notices';
import type { SentOperation } from '../../../__tests__/groupC-link';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

describe('BrandWizardPage new brand', () => {
  it('opens on the details step with the account email as the contact email', async () => {
    mountWizard();
    expect(await screen.findByText('New brand')).toBeTruthy();
    expect(screen.getByTestId('brand-wizard-progress').textContent).toContain('0% complete');
    await waitFor(() => expect(fieldInput('brand-wizard-contact-email').value).toBe('asha@brand.example.com'));
    // A brand that does not exist yet has nothing to delete or pause.
    expect(screen.queryByTestId('brand-danger-delete')).toBeNull();
    expect((screen.getByTestId('brand-wizard-back') as HTMLButtonElement).disabled).toBe(true);
  });

  it('will not move on while a field on the step is malformed, and says so in the step heading', async () => {
    const sent: SentOperation[] = [];
    mountWizard({ sent });
    await screen.findByTestId('brand-wizard-website');
    typeInto('brand-wizard-website', 'not a link');
    fireEvent.click(screen.getByTestId('brand-wizard-next'));

    await waitFor(() =>
      expect(screen.getByTestId('brand-wizard-step-errors-details').textContent).toContain(
        'Enter a valid link starting with http:// or https://.',
      ),
    );
    expect(sent.some((op) => op.name === 'SaveEcommBrand')).toBe(false);
  });

  it('saves a draft, mints the id and moves to the edit route', async () => {
    const sent: SentOperation[] = [];
    mountWizard({
      sent,
      answers: { SaveEcommBrand: { saveEcommBrand: wizardBrand({ id: 'b9', brand_name: 'Fresh Brand' }) } },
    });
    await screen.findByTestId('brand-wizard-brand-name');
    typeInto('brand-wizard-brand-name', 'Fresh Brand');
    fireEvent.click(screen.getByTestId('brand-wizard-save-draft'));

    await waitFor(() => expect(messages()).toContain('Draft saved.'));
    const save = sent.find((op) => op.name === 'SaveEcommBrand');
    expect(save?.variables.brand_doc_id).toBeNull();
    expect(save?.variables.input).toMatchObject({ brand_name: 'Fresh Brand', country: 'India' });
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b9/edit'));
  });

  it('keeps the partner on the step and reports a refused save', async () => {
    mountWizard({ answers: { SaveEcommBrand: new Error('Brand name already taken') } });
    await screen.findByTestId('brand-wizard-brand-name');
    fireEvent.click(screen.getByTestId('brand-wizard-save-draft'));
    await waitFor(() => expect(messages()).toContain('Brand name already taken'));
    expect(where()).toBe('/ecomm-brand/new');
  });

  it('moves to the next step after saving a valid step', async () => {
    mountWizard({ answers: { SaveEcommBrand: { saveEcommBrand: wizardBrand({ id: 'b9' }) } } });
    await screen.findByTestId('brand-wizard-brand-name');
    fireEvent.click(screen.getByTestId('brand-wizard-next'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b9/edit'));
  });
});

describe('BrandWizardPage saved brand', () => {
  it('opens on the step the server says is next', async () => {
    mountWizard({
      route: EDIT,
      brand: wizardBrand({ completion: { __typename: 'BrandCompletion', percent: 30, next_step: 3, steps: [] } }),
    });
    expect(await screen.findByTestId('brand-wizard-account-holder-name')).toBeTruthy();
    expect(screen.getByTestId('brand-wizard-razorpay-confirmation').textContent).toContain('Connect Razorpay');
  });

  it('opens on the step a link asked for', async () => {
    mountWizard({ route: `${EDIT}?step=categories`, brand: wizardBrand() });
    expect(await screen.findByTestId('brand-wizard-category-input')).toBeTruthy();
  });

  it('goes back a step', async () => {
    mountWizard({
      route: EDIT,
      brand: wizardBrand({ completion: { __typename: 'BrandCompletion', percent: 30, next_step: 1, steps: [] } }),
    });
    await screen.findByTestId('brand-wizard-registered-business-name');
    fireEvent.click(screen.getByTestId('brand-wizard-back'));
    expect(await screen.findByTestId('brand-wizard-brand-name')).toBeTruthy();
  });

  it('prefills every field from the saved brand', async () => {
    mountWizard({ route: EDIT, brand: wizardBrand({ brand_name: 'Aurora Pets', tagline: 'Happy tails' }) });
    await waitFor(() => expect(fieldInput('brand-wizard-brand-name').value).toBe('Aurora Pets'));
    expect(fieldInput('brand-wizard-tagline').value).toBe('Happy tails');
    expect(screen.getByText('Aurora Pets')).toBeTruthy();
  });

  it('says so when the brand is not in the account', async () => {
    mountWizard({ route: EDIT, brand: null });
    expect(await screen.findByText('This brand is not in your account.')).toBeTruthy();
  });

  it('shows the server error text of a rejected brand', async () => {
    mountWizard({ route: EDIT, brand: wizardBrand({ status: 'REJECTED', reviewer_notes: 'Logo is blurry.' }) });
    expect((await screen.findByTestId('brand-wizard-rejected')).textContent).toContain('Rejected: Logo is blurry.');
  });
});

describe('BrandWizardPage review lock', () => {
  it('locks a submitted brand, lets it be withdrawn and reloads', async () => {
    const sent: SentOperation[] = [];
    mountWizard({
      route: EDIT,
      brand: wizardBrand({ status: 'SUBMITTED' }),
      sent,
      answers: { WithdrawEcommBrand: { withdrawEcommBrand: { __typename: 'EcommBrand', id: 'b1', status: 'DRAFT' } } },
    });
    expect(await screen.findByTestId('brand-wizard-under-review')).toBeTruthy();
    expect(screen.queryByTestId('brand-wizard-save-draft')).toBeNull();
    expect(fieldInput('brand-wizard-brand-name').disabled).toBe(true);
    const loads = sent.filter((op) => op.name === 'MyEcommBrand').length;

    fireEvent.click(screen.getByTestId('brand-wizard-withdraw'));
    await waitFor(() => expect(messages()).toContain('Brand moved back to draft — you can edit it again.'));
    expect(sent.find((op) => op.name === 'WithdrawEcommBrand')?.variables).toEqual({ brand_doc_id: 'b1' });
    await waitFor(() => expect(sent.filter((op) => op.name === 'MyEcommBrand').length).toBeGreaterThan(loads));
  });

  it('reports a refused withdrawal', async () => {
    mountWizard({
      route: EDIT,
      brand: wizardBrand({ status: 'SUBMITTED' }),
      answers: { WithdrawEcommBrand: new Error('Review already started') },
    });
    fireEvent.click(await screen.findByTestId('brand-wizard-withdraw'));
    await waitFor(() => expect(messages()).toContain('Review already started'));
  });

  it('shows an approved brand as live and read-only with the pause control', async () => {
    mountWizard({ route: EDIT, brand: wizardBrand({ status: 'APPROVED', is_active: false }) });
    expect(await screen.findByTestId('brand-wizard-approved')).toBeTruthy();
    expect(screen.getByTestId('brand-danger-pause').textContent).toBe('Reactivate');
    fireEvent.click(screen.getByTestId('brand-wizard-next'));
    expect(await screen.findByTestId('brand-wizard-registered-business-name')).toBeTruthy();
  });
});
