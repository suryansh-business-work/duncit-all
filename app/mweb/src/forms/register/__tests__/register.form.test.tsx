import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import type { SignupStep } from '@duncit/utils';
import { describe, expect, it, vi } from 'vitest';
import RegisterForm from '../register.form';
import { PUBLIC_APP_SETTINGS } from '../../../utils/dateFormat';
import { SIGNUP_CONTACT_AVAILABILITY } from '../useSignupContactCheck';

const settingsMock = {
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        // The picker types what this pattern shows, with the month as digits.
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        time_source: null,
        custom_time: null,
        custom_time_set_at: null,
        server_time: null,
        min_signup_age: 13,
        draft_retention_days: 3,
        ticket_discount_max_pct: null,
        happening_nearby_days: null,
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

/** The register form's policy list (the hook keeps its document private). */
const SIGNUP_POLICIES = gql`
  query SignupPolicies {
    signupPolicies {
      id
      slug
      title
      content
    }
  }
`;

/** No policies to accept, so step three is the password pair alone. */
const policiesMock = {
  request: { query: SIGNUP_POLICIES },
  result: { data: { signupPolicies: [] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

/** The contact step asks the server about each box as it is typed; both are free. */
const availabilityMock = (variables: Record<string, string>, field: 'email' | 'phone') => ({
  request: { query: SIGNUP_CONTACT_AVAILABILITY, variables },
  result: {
    data: {
      signupContactAvailability: {
        __typename: 'SignupContactAvailability',
        email_available: field === 'email' ? true : null,
        phone_available: field === 'phone' ? true : null,
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const mocks = [
  settingsMock,
  policiesMock,
  availabilityMock({ email: 'riya@gmail.com' }, 'email'),
  availabilityMock({ ext: '+91', num: '9845012345' }, 'phone'),
];

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
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
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
/**
 * The date of birth is a sectioned picker field: its label names the group and
 * each day/month/year spinbutton, so the box that carries the typed value is
 * the field's own input, reached by its test id. It is typed in the admin
 * pattern's keyboard form — 'dd MMM yyyy' types as 'dd MM yyyy'.
 */
const dobInput = () => screen.getByTestId('field-dob-input') as HTMLInputElement;

/** Step one, answered. */
function fillWho() {
  fireEvent.change(field('^Name'), { target: { value: 'Riya Sharma' } });
  fireEvent.change(dobInput(), { target: { value: '23 04 1990' } });
}

/**
 * Step two, answered. Continue stays shut while the server is still being asked
 * whether the number and the email are free, and opens once both come back free.
 */
async function fillContact() {
  fireEvent.change(field('WhatsApp number'), { target: { value: '9845012345' } });
  fireEvent.change(field('^Email'), { target: { value: 'riya@gmail.com' } });
  expect(next()).toBeDisabled();
  await waitFor(() => expect(next()).toBeEnabled());
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
  await fillContact();
  fireEvent.click(next());
  await waitFor(() => expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument());
}

describe('RegisterForm — one step at a time', () => {
  it('opens on step one, showing only its own boxes', () => {
    renderForm();
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /date of birth/i })).toBeInTheDocument();
    expect(dobInput()).toBeInTheDocument();
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

    await fillContact();
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
      dob: '1990-04-23',
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
    await fillContact();
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
        dob: '2000-04-23',
        referralCode: 'DUN-A1B2C3',
        acceptedPolicyIds: [],
        marketingOptIn: false,
      },
    });
    expect(field('^Name')).toHaveValue('Seed User');
    expect(dobInput()).toHaveValue('23 04 2000');
    expect(field('referral code')).toHaveValue('DUN-A1B2C3');
  });
});
