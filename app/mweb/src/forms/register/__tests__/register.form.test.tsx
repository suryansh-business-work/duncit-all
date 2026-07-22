import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
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

function renderForm(props: Partial<React.ComponentProps<typeof RegisterForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const utils = render(
    <MockedProvider mocks={[settingsMock]}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterForm onSubmit={onSubmit} {...props} />
      </MemoryRouter>
    </MockedProvider>,
  );
  return { onSubmit, ...utils };
}

const field = (label: string) =>
  screen.getByLabelText(new RegExp(label, 'i')) as HTMLInputElement;

async function fillValid() {
  fireEvent.change(field('^Name'), { target: { value: 'Riya Sharma' } });
  fireEvent.change(field('^Email'), { target: { value: 'riya@gmail.com' } });
  fireEvent.change(field('^Password'), { target: { value: 'password123' } });
  fireEvent.change(field('Confirm Password'), { target: { value: 'password123' } });
  // choose a birth year via the picker
  fireEvent.click(screen.getByRole('button', { name: /choose date/i }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('radio', { name: '1990' }));
}

describe('RegisterForm — rendering', () => {
  it('renders every field, the submit button and the sign-in link', () => {
    renderForm();
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/birth year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('seeds fields from initialValues', () => {
    renderForm({
      initialValues: {
        name: 'Seed User',
        email: 'seed@x.com',
        password: 'seedpass1',
        confirmPassword: 'seedpass1',
        dob: '2000-01-01',
      },
    });
    expect(field('^Name')).toHaveValue('Seed User');
    expect(field('^Email')).toHaveValue('seed@x.com');
    expect(field('birth year')).toHaveValue('2000');
  });
});

describe('RegisterForm — loading & error states', () => {
  it('disables the button and shows "Creating…" while loading', () => {
    renderForm({ loading: true });
    const btn = screen.getByRole('button', { name: /creating/i });
    expect(btn).toBeDisabled();
  });

  it('renders the errorMessage prop in an alert', () => {
    renderForm({ errorMessage: 'Email already used' });
    expect(screen.getByRole('alert')).toHaveTextContent('Email already used');
  });
});

describe('RegisterForm — password visibility toggles', () => {
  it('toggles the password field between hidden and visible', () => {
    renderForm();
    const pwd = field('^Password');
    expect(pwd).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getAllByRole('button', { name: /show password/i })[0]);
    expect(pwd).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(pwd).toHaveAttribute('type', 'password');
  });

  it('toggles the confirm-password field independently', () => {
    renderForm();
    const confirm = field('Confirm Password');
    expect(confirm).toHaveAttribute('type', 'password');
    // second show-password button belongs to confirm field
    fireEvent.click(screen.getAllByRole('button', { name: /show password/i })[1]);
    expect(confirm).toHaveAttribute('type', 'text');
  });
});

describe('RegisterForm — validation', () => {
  it('does not call onSubmit and surfaces required errors when empty', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('flags mismatched passwords', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.change(field('^Name'), { target: { value: 'Riya Sharma' } });
    fireEvent.change(field('^Email'), { target: { value: 'riya@gmail.com' } });
    fireEvent.change(field('^Password'), { target: { value: 'password123' } });
    fireEvent.change(field('Confirm Password'), { target: { value: 'different1' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('RegisterForm — submission', () => {
  it('calls onSubmit with the collected values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Riya Sharma',
      email: 'riya@gmail.com',
      password: 'password123',
      confirmPassword: 'password123',
      dob: '1990-01-01',
    });
  });

  it('shows a submit-error alert when onSubmit rejects with an Error', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network down'));
    renderForm({ onSubmit });
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });

  it('shows a generic message when onSubmit rejects with a non-Error', async () => {
    const onSubmit = vi.fn().mockRejectedValue('boom');
    renderForm({ onSubmit });
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
