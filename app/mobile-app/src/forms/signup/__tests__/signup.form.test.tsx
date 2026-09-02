import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { latestEligibleBirthYear } from '@duncit/datetime';
import type { SignupStep } from '@duncit/utils';

import { SignupForm } from '@/forms/signup';
import { renderWithProviders } from '@/utils/test-utils';

/** The newest year the picker offers, so the test never rots with the calendar. */
const ELIGIBLE_YEAR = String(latestEligibleBirthYear(18));

/**
 * The form only ever shows one step, and the screen owns which — so the
 * harness owns it too, exactly as SignupScreen does.
 */
function Harness(props: Partial<React.ComponentProps<typeof SignupForm>>) {
  const [step, setStep] = useState<SignupStep>('WHO');
  return <SignupForm step={step} onStep={setStep} onSubmit={jest.fn()} {...props} />;
}

const next = () => screen.getByTestId('signup-next');

function fillWho() {
  fireEvent.changeText(screen.getByTestId('field-name'), 'Riya Sharma');
  // The year comes from a sheet: open the trigger, then pick the option.
  fireEvent.press(screen.getByTestId('signup-dob-year-trigger'));
  fireEvent.press(screen.getByTestId(`signup-dob-year-option-${ELIGIBLE_YEAR}`));
}

function fillContact() {
  fireEvent.changeText(screen.getByTestId('field-phoneNumber'), '9845012345');
  fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
}

function fillSecurity(confirm = 'StrongPass123') {
  fireEvent.changeText(screen.getByTestId('field-password'), 'StrongPass123');
  fireEvent.changeText(screen.getByTestId('field-confirmPassword'), confirm);
}

async function toContact() {
  fillWho();
  fireEvent.press(next());
  await waitFor(() => expect(screen.getByTestId('field-phoneNumber')).toBeOnTheScreen());
}

async function toSecurity() {
  await toContact();
  fillContact();
  fireEvent.press(next());
  await waitFor(() => expect(screen.getByTestId('field-password')).toBeOnTheScreen());
}

describe('SignupForm — one step at a time', () => {
  it('opens on step one, showing only its own boxes', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByTestId('field-name')).toBeOnTheScreen();
    expect(screen.getByTestId('signup-dob-year-trigger')).toBeOnTheScreen();
    expect(screen.getByTestId('field-referralCode')).toBeOnTheScreen();
    // The later steps' fields are not rendered at all.
    expect(screen.queryByTestId('field-email')).toBeNull();
    expect(screen.queryByTestId('field-password')).toBeNull();
  });

  it('has no Back on the first step, and one after it', async () => {
    renderWithProviders(<Harness />);
    expect(screen.queryByTestId('signup-back')).toBeNull();
    await toContact();
    expect(screen.getByTestId('signup-back')).toBeOnTheScreen();
  });

  it('keeps what was typed when you go back a step', async () => {
    renderWithProviders(<Harness />);
    await toContact();
    fireEvent.press(screen.getByTestId('signup-back'));
    await waitFor(() => expect(screen.getByTestId('field-name')).toBeOnTheScreen());
    expect(screen.getByTestId('field-name').props.value).toBe('Riya Sharma');
  });

  it('walks the three steps and submits what was typed', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);
    await toSecurity();
    fillSecurity();
    fireEvent.press(next());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Riya Sharma',
      dobYear: ELIGIBLE_YEAR,
      email: 'riya@duncit.com',
      phoneNumber: '9845012345',
      password: 'StrongPass123',
    });
  });
});

describe('SignupForm — a step validates its own boxes only', () => {
  it('refuses to leave step one while it is empty', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);
    fireEvent.press(next());
    await waitFor(() => expect(screen.getByTestId('name-error')).toBeOnTheScreen());
    // Still on step one, and nothing was submitted.
    expect(screen.getByTestId('field-name')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('says nothing about a password while the reader is on step one', async () => {
    renderWithProviders(<Harness />);
    fireEvent.press(next());
    await waitFor(() => expect(screen.getByTestId('name-error')).toBeOnTheScreen());
    expect(screen.queryByTestId('password-error')).toBeNull();
  });

  it('flags mismatched passwords on the step that owns them', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<Harness onSubmit={onSubmit} />);
    await toSecurity();
    fillSecurity('Different123');
    fireEvent.press(next());

    await waitFor(() =>
      expect(screen.getByTestId('confirmPassword-error')).toHaveTextContent(
        'Passwords do not match',
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('SignupForm — chrome', () => {
  it('renders the error message when provided', () => {
    renderWithProviders(<Harness errorMessage="Email already in use" />);
    expect(screen.getByTestId('signup-error')).toHaveTextContent('Email already in use');
  });

  it('names the last step button after what it does', async () => {
    renderWithProviders(<Harness />);
    await toSecurity();
    expect(screen.getByTestId('signup-next')).toHaveTextContent(/create account/i);
  });
});
