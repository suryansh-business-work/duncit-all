import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import type { SignupStep } from '@duncit/utils';
import { describe, expect, it, vi } from 'vitest';
import RegisterForm from '../register.form';
import { PUBLIC_APP_SETTINGS } from '../../../utils/dateFormat';

const settingsMock = {
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        min_birth_year: 1950,
        max_birth_year: 2010,
        draft_retention_days: 3,
      },
    },
  },
};

/**
 * The form only ever shows one step, and the page owns which — so the harness
 * owns it too, exactly as RegisterPage does. Anything else would be testing a
 * component that cannot advance.
 */
function Harness(props: Partial<React.ComponentProps<typeof RegisterForm>>) {
  const [step, setStep] = useState<SignupStep>('WHO');
  return (
    <RegisterForm
      step={step}
      onStep={setStep}
      onSubmit={vi.fn()}
      {...props}
      // The harness drives the step unless a test pins one deliberately.
      {...(props.step ? { step: props.step, onStep: props.onStep ?? setStep } : {})}
    />
  );
}

function renderForm(props: Partial<React.ComponentProps<typeof RegisterForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const utils = render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[settingsMock]}>
      <DuncitLocalizationProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Harness {...props} onSubmit={onSubmit} />
        </MemoryRouter>
      </DuncitLocalizationProvider>
    </MockedProvider>,
  );
  return { onSubmit, ...utils };
}

const field = (label: string) => screen.getByLabelText(new RegExp(label, 'i')) as HTMLInputElement;
const next = () => screen.getByTestId('signup-next');

/** Step one, answered. */
function fillWho() {
  fireEvent.change(field('^Name'), { target: { value: 'Riya Sharma' } });
  fireEvent.change(field('birth year'), { target: { value: '1990' } });
}

/** Step two, answered. */
function fillContact() {
  fireEvent.change(field('WhatsApp number'), { target: { value: '9845012345' } });
  fireEvent.change(field('^Email'), { target: { value: 'riya@gmail.com' } });
}

/** Step three, answered. */
function fillSecurity(confirm = 'password123') {
  fireEvent.change(field('^Password'), { target: { value: 'password123' } });
  fireEvent.change(field('Confirm Password'), { target: { value: confirm } });
}

/** All three steps answered, ending on the one that creates the account. */
async function walkToSecurity() {
  fillWho();
  fireEvent.click(next());
  await waitFor(() => expect(screen.getByLabelText(/WhatsApp number/i)).toBeInTheDocument());
  fillContact();
  fireEvent.click(next());
  await waitFor(() => expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument());
}

describe('RegisterForm — one step at a time', () => {
  it('opens on step one, showing only its own boxes', () => {
    renderForm();
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/birth year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/referral code/i)).toBeInTheDocument();
    // The later steps' fields are not merely hidden — they are not rendered.
    expect(screen.queryByLabelText(/^Email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Password/i)).not.toBeInTheDocument();
  });

  it('has no Back on the first step, and one on every step after it', async () => {
    renderForm();
    expect(screen.queryByTestId('signup-back')).not.toBeInTheDocument();
    fillWho();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByLabelText(/WhatsApp number/i)).toBeInTheDocument());
    expect(screen.getByTestId('signup-back')).toBeInTheDocument();
  });

  it('walks forward through the three steps and creates the account at the end', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    fillWho();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByLabelText(/WhatsApp number/i)).toBeInTheDocument());

    fillContact();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument());
    expect(next()).toHaveTextContent(/create account/i);

    fillSecurity();
    fireEvent.click(next());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Riya Sharma',
      email: 'riya@gmail.com',
      phoneNumber: '9845012345',
      password: 'password123',
      dobYear: '1990',
    });
  });

  it('keeps what was typed when you go back a step', async () => {
    renderForm();
    fillWho();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByLabelText(/WhatsApp number/i)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('signup-back'));
    await waitFor(() => expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument());
    expect(field('^Name')).toHaveValue('Riya Sharma');
  });
});

describe('RegisterForm — a step validates its own boxes only', () => {
  it('refuses to leave step one while it is empty', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    // Still on step one, and nothing was submitted.
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not complain about a password while the reader is on step one', async () => {
    renderForm();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    expect(screen.queryByText(/Min 8 characters/i)).not.toBeInTheDocument();
  });

  it('flags mismatched passwords on the step that owns them', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fillWho();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByLabelText(/WhatsApp number/i)).toBeInTheDocument());
    fillContact();
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument());

    fillSecurity('different1');
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('RegisterForm — errors and toggles', () => {
  it('offers to create the account on the last step', () => {
    renderForm({ step: 'SECURITY' });
    expect(screen.getByTestId('signup-next')).toHaveTextContent(/create account/i);
  });

  it('renders the errorMessage prop in an alert', () => {
    renderForm({ errorMessage: 'Email already used' });
    expect(screen.getByRole('alert')).toHaveTextContent('Email already used');
  });

  it('toggles each password box independently', () => {
    renderForm({ step: 'SECURITY' });
    const pwd = field('^Password');
    const confirm = field('Confirm Password');
    expect(pwd).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getAllByRole('button', { name: /show password/i })[0]);
    expect(pwd).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getAllByRole('button', { name: /show password/i })[0]);
    expect(confirm).toHaveAttribute('type', 'text');
  });

  it('shows what a rejected submit said', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network down'));
    renderForm({ onSubmit });
    await walkToSecurity();
    fillSecurity();
    fireEvent.click(next());
    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });

  it('falls back to a generic message when a submit rejects with a non-Error', async () => {
    const onSubmit = vi.fn().mockRejectedValue('boom');
    renderForm({ onSubmit });
    await walkToSecurity();
    fillSecurity();
    fireEvent.click(next());
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('goes back to the step that owns a broken box instead of dying quietly', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    await walkToSecurity();
    fillSecurity();

    // Something earlier went wrong — a box this step does not render.
    fireEvent.click(screen.getByTestId('signup-back'));
    await waitFor(() => expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument());
    fireEvent.change(field('^Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(next());
    // Refused, so still on the contact step with the message beside the box.
    await waitFor(() => expect(screen.getByText(/valid email/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('seeds the boxes from initialValues', () => {
    renderForm({
      initialValues: {
        name: 'Seed User',
        email: 'seed@x.com',
        phoneExtension: '+91',
        phoneNumber: '9845012345',
        whatsappIsMobile: true,
        password: 'seedpass1',
        confirmPassword: 'seedpass1',
        dobYear: '2000',
        referralCode: 'DUN-A1B2C3',
        acceptedPolicyIds: [],
      },
    });
    expect(field('^Name')).toHaveValue('Seed User');
    expect(field('birth year')).toHaveValue('2000');
    expect(field('referral code')).toHaveValue('DUN-A1B2C3');
  });
});
